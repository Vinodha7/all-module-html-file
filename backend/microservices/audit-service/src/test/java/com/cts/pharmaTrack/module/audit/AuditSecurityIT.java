package com.cts.pharmaTrack.module.audit;

import com.cts.pharmaTrack.module.audit.dto.AuditEventRequest;
import com.cts.pharmaTrack.module.audit.security.AuditRbac;
import com.cts.pharmaTrack.module.audit.service.AuditIngestService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Security integration tests for the Audit Service endpoints: authentication,
 * the internal-token guard on ingest, role enforcement on the integrity report,
 * and module-scoped read visibility. Uses real JWTs signed with the shared
 * secret so the shared-lib JwtAuthFilter validates them and populates the role.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuditSecurityIT {

    private static final String EVENTS = "/pharmaTrack/audit/events";
    private static final String SUMMARY = "/pharmaTrack/audit/summary";
    private static final String VERIFY = "/pharmaTrack/audit/verifyIntegrity";
    private static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuditIngestService ingestService;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${pharmatrack.audit.internal-token}")
    private String internalToken;

    // ── Authentication ─────────────────────────────────────────────────────────

    @Test
    void postEvents_withoutJwt_isUnauthorized() throws Exception {
        mockMvc.perform(post(EVENTS)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sampleEventJson()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getEvents_withoutJwt_isUnauthorized() throws Exception {
        mockMvc.perform(get(EVENTS))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getSummary_withoutJwt_isUnauthorized() throws Exception {
        mockMvc.perform(get(SUMMARY))
                .andExpect(status().isUnauthorized());
    }

    // ── Internal token ─────────────────────────────────────────────────────────

    @Test
    void postEvents_withJwtButNoInternalToken_isForbidden() throws Exception {
        mockMvc.perform(post(EVENTS)
                        .header("Authorization", bearer(AuditRbac.ROLE_ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sampleEventJson()))
                .andExpect(status().isForbidden());
    }

    @Test
    void postEvents_withJwtAndInvalidInternalToken_isForbidden() throws Exception {
        mockMvc.perform(post(EVENTS)
                        .header("Authorization", bearer(AuditRbac.ROLE_ADMIN))
                        .header(INTERNAL_TOKEN_HEADER, "wrong-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sampleEventJson()))
                .andExpect(status().isForbidden());
    }

    @Test
    void postEvents_withJwtAndValidInternalToken_isSuccessful() throws Exception {
        mockMvc.perform(post(EVENTS)
                        .header("Authorization", bearer(AuditRbac.ROLE_ADMIN))
                        .header(INTERNAL_TOKEN_HEADER, internalToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sampleEventJson()))
                .andExpect(status().is2xxSuccessful());
    }

    // ── Role enforcement (integrity endpoint) ──────────────────────────────────

    @Test
    void verifyIntegrity_asAuditor_isOk() throws Exception {
        mockMvc.perform(get(VERIFY).header("Authorization", bearer(AuditRbac.ROLE_AUDITOR)))
                .andExpect(status().isOk());
    }

    @Test
    void verifyIntegrity_asAdmin_isOk() throws Exception {
        mockMvc.perform(get(VERIFY).header("Authorization", bearer(AuditRbac.ROLE_ADMIN)))
                .andExpect(status().isOk());
    }

    @Test
    void verifyIntegrity_asInvestigator_isForbidden() throws Exception {
        mockMvc.perform(get(VERIFY).header("Authorization", bearer(AuditRbac.ROLE_INVESTIGATOR)))
                .andExpect(status().isForbidden());
    }

    // ── Module visibility ──────────────────────────────────────────────────────

    @Test
    void auditor_seesAllModules() throws Exception {
        seed(AuditRbac.MODULE_BATCH_MANUFACTURING);
        seed(AuditRbac.MODULE_CLINICAL_TRIAL);
        seed(AuditRbac.MODULE_REGULATORY_AFFAIRS);

        mockMvc.perform(get(EVENTS).header("Authorization", bearer(AuditRbac.ROLE_AUDITOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3));
    }

    @Test
    void investigator_seesOnlyTrialAndEnrollment() throws Exception {
        seed(AuditRbac.MODULE_BATCH_MANUFACTURING);
        seed(AuditRbac.MODULE_CLINICAL_TRIAL);
        seed(AuditRbac.MODULE_SUBJECT_ENROLLMENT);

        // Investigator scope = ClinicalTrial + SubjectEnrollment -> 2 of the 3.
        mockMvc.perform(get(EVENTS).header("Authorization", bearer(AuditRbac.ROLE_INVESTIGATOR)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2));
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String bearer(String role) {
        Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        String token = Jwts.builder()
                .setClaims(Map.of(
                        "userId", 1,
                        "email", role.toLowerCase() + "@pharma.com",
                        "name", role + " User",
                        "role", role))
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 3_600_000))
                .signWith(key)
                .compact();
        return "Bearer " + token;
    }

    private String sampleEventJson() {
        return "{"
                + "\"eventId\":\"" + UUID.randomUUID() + "\","
                + "\"module\":\"" + AuditRbac.MODULE_BATCH_MANUFACTURING + "\","
                + "\"entityType\":\"BatchRecord\","
                + "\"entityId\":\"42\","
                + "\"action\":\"CREATE\","
                + "\"performedBy\":\"U1\","
                + "\"performedByName\":\"Test User\","
                + "\"performedAt\":\"2026-07-18T10:00:00\","
                + "\"correlationId\":\"c1\""
                + "}";
    }

    private void seed(String module) {
        AuditEventRequest r = new AuditEventRequest();
        r.setEventId(UUID.randomUUID().toString());
        r.setModule(module);
        r.setEntityType("Entity");
        r.setEntityId("1");
        r.setAction("CREATE");
        r.setPerformedBy("U1");
        r.setPerformedByName("Test User");
        r.setPerformedAt(LocalDateTime.now());
        r.setCorrelationId("c1");
        ingestService.ingest(r);
    }
}
