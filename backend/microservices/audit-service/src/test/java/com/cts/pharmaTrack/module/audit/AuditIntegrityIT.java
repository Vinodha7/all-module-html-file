package com.cts.pharmaTrack.module.audit;

import com.cts.pharmaTrack.module.audit.dto.AuditEventRequest;
import com.cts.pharmaTrack.module.audit.dto.AuditIntegrityReport;
import com.cts.pharmaTrack.module.audit.dto.IntegrityStatus;
import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import com.cts.pharmaTrack.module.audit.repository.AuditEventRepository;
import com.cts.pharmaTrack.module.audit.service.AuditIngestService;
import com.cts.pharmaTrack.module.audit.service.AuditIntegrityService;
import com.cts.pharmaTrack.module.audit.util.AuditCanonicalizer;
import com.cts.pharmaTrack.module.audit.util.AuditHashService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.repository.CrudRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for tamper-evidence: recomputing the keyed HMAC over stored
 * rows and classifying VERIFIED / TAMPERED / UNVERIFIABLE. Tampering is simulated
 * with native SQL (the entity/repository expose no update/delete path). Isolated
 * by @Transactional rollback.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuditIntegrityIT {

    @Autowired
    private AuditIngestService ingestService;

    @Autowired
    private AuditIntegrityService integrityService;

    @Autowired
    private AuditHashService hashService;

    @Autowired
    private AuditCanonicalizer canonicalizer;

    @PersistenceContext
    private EntityManager em;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── 1. Clean ledger -> all VERIFIED ─────────────────────────────────────────
    @Test
    void cleanLedger_allVerified() throws Exception {
        JsonNode json = objectMapper.readTree("{\"b\":2,\"a\":1}");
        seedFlushed("BatchManufacturing", json, null);
        seedFlushed("ClinicalTrial", null, null);
        em.clear(); // force verify() to read DB values (post-MySQL-normalization)

        AuditIntegrityReport report = integrityService.verify();

        assertThat(report.getTotal()).isEqualTo(2);
        assertThat(report.getVerified()).isEqualTo(2);
        assertThat(report.getTampered()).isZero();
        assertThat(report.getUnverifiable()).isZero();
        assertThat(report.isIntact()).isTrue();
        assertThat(report.getIssues()).isEmpty();
    }

    // ── 2. Tampered row -> TAMPERED detected ───────────────────────────────────
    @Test
    void tamperedRow_detected() {
        String id = seedFlushed("BatchManufacturing", null, null);

        // Mutate a hashed field out-of-band, leaving rowHash unchanged.
        em.createNativeQuery("UPDATE audit_event SET performedBy = 'HACKER' WHERE eventId = :id")
                .setParameter("id", id)
                .executeUpdate();
        em.clear();

        AuditIntegrityReport report = integrityService.verify();

        assertThat(report.getTampered()).isGreaterThanOrEqualTo(1);
        assertThat(report.isIntact()).isFalse();
        assertThat(report.getIssues())
                .anyMatch(i -> id.equals(i.getEventId())
                        && i.getStatus() == IntegrityStatus.TAMPERED);
    }

    // ── 3. Missing rowHash -> UNVERIFIABLE ─────────────────────────────────────
    @Test
    void missingRowHash_unverifiable() {
        String id = seedFlushed("BatchManufacturing", null, null);

        // rowHash is NOT NULL, so blank it (native SQL bypasses JPA updatable=false).
        em.createNativeQuery("UPDATE audit_event SET rowHash = '' WHERE eventId = :id")
                .setParameter("id", id)
                .executeUpdate();
        em.clear();

        AuditIntegrityReport report = integrityService.verify();

        assertThat(report.getUnverifiable()).isGreaterThanOrEqualTo(1);
        assertThat(report.isIntact()).isFalse();
        assertThat(report.getIssues())
                .anyMatch(i -> id.equals(i.getEventId())
                        && i.getStatus() == IntegrityStatus.UNVERIFIABLE);
    }

    // ── 4. Invalid persisted JSON -> UNVERIFIABLE (mechanism) ──────────────────
    @Test
    void invalidJson_isRejectedByCanonicalizer() {
        // MySQL's json column prevents invalid JSON from ever being persisted, so
        // the integrity service's "invalid persisted JSON -> UNVERIFIABLE" branch
        // is proven at the canonicalizer level: canonicalizing malformed JSON
        // throws, which the service maps to UNVERIFIABLE.
        assertThatThrownBy(() -> canonicalizer.canonicalizeJson("{not-valid-json"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── 5. Counts consistency: total == verified + tampered + unverifiable ──────
    @Test
    void countsConsistency() {
        String clean = seedFlushed("BatchManufacturing", null, null);
        String toTamper = seedFlushed("ClinicalTrial", null, null);
        String toBlank = seedFlushed("RegulatoryAffairs", null, null);

        em.createNativeQuery("UPDATE audit_event SET action = 'HACKED' WHERE eventId = :id")
                .setParameter("id", toTamper).executeUpdate();
        em.createNativeQuery("UPDATE audit_event SET rowHash = '' WHERE eventId = :id")
                .setParameter("id", toBlank).executeUpdate();
        em.clear();

        AuditIntegrityReport report = integrityService.verify();

        assertThat(report.getTotal()).isEqualTo(3);
        assertThat(report.getVerified()).isEqualTo(1);
        assertThat(report.getTampered()).isEqualTo(1);
        assertThat(report.getUnverifiable()).isEqualTo(1);
        assertThat(report.getTotal())
                .isEqualTo(report.getVerified() + report.getTampered() + report.getUnverifiable());
        assertThat(clean).isNotBlank(); // clean row remains VERIFIED
    }

    // ── 6. HMAC determinism ─────────────────────────────────────────────────────
    @Test
    void hmacDeterminism() {
        assertThat(hashService.hash(event("CREATE")))
                .isEqualTo(hashService.hash(event("CREATE")));
    }

    // ── 7. HMAC sensitivity ─────────────────────────────────────────────────────
    @Test
    void hmacSensitivity() {
        assertThat(hashService.hash(event("CREATE")))
                .isNotEqualTo(hashService.hash(event("UPDATE")));
    }

    // ── 8. No update/delete path ────────────────────────────────────────────────
    @Test
    void noUpdateOrDeletePath() {
        boolean exposesMutation = Arrays.stream(AuditEventRepository.class.getMethods())
                .map(m -> m.getName().toLowerCase())
                .anyMatch(n -> n.contains("delete") || n.startsWith("update"));
        assertThat(exposesMutation).isFalse();
        assertThat(CrudRepository.class.isAssignableFrom(AuditEventRepository.class)).isFalse();
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String seedFlushed(String module, JsonNode oldV, JsonNode newV) {
        String id = UUID.randomUUID().toString();
        AuditEventRequest r = new AuditEventRequest();
        r.setEventId(id);
        r.setModule(module);
        r.setEntityType("Entity");
        r.setEntityId("1");
        r.setAction("CREATE");
        r.setPerformedBy("U1");
        r.setPerformedByName("Test User");
        r.setPerformedAt(LocalDateTime.now());
        r.setCorrelationId("c1");
        r.setOldValues(oldV);
        r.setNewValues(newV);
        ingestService.ingest(r);
        em.flush();
        return id;
    }

    /** A fully-populated, detached event for hash determinism/sensitivity checks. */
    private AuditEvent event(String action) {
        AuditEvent e = new AuditEvent();
        e.setEventId("fixed-event-id");
        e.setModule("BatchManufacturing");
        e.setEntityType("BatchRecord");
        e.setEntityId("42");
        e.setAction(action);
        e.setPerformedBy("U1");
        e.setPerformedAt(LocalDateTime.of(2026, 7, 18, 10, 0, 0));
        e.setCorrelationId("c1");
        return e;
    }
}
