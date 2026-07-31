package com.cts.pharmaTrack.module.audit;

import com.cts.pharmaTrack.module.audit.dto.AuditEventFilter;
import com.cts.pharmaTrack.module.audit.dto.AuditEventRequest;
import com.cts.pharmaTrack.module.audit.dto.AuditEventResponse;
import com.cts.pharmaTrack.module.audit.dto.AuditSummaryResponse;
import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import com.cts.pharmaTrack.module.audit.repository.AuditEventRepository;
import com.cts.pharmaTrack.module.audit.security.AuditRbac;
import com.cts.pharmaTrack.module.audit.service.AuditIngestService;
import com.cts.pharmaTrack.module.audit.service.AuditIngestService.IngestResult;
import com.cts.pharmaTrack.module.audit.service.AuditQueryService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for the ingest + query pipeline. Each test runs in a
 * transaction that is rolled back afterwards (the append-only repository has no
 * delete), so tests are isolated and summary/scope counts are deterministic.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuditIngestQueryIT {

    @Autowired
    private AuditIngestService ingestService;

    @Autowired
    private AuditQueryService queryService;

    @Autowired
    private AuditEventRepository repository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── 1. Ingest new event -> persisted, with rowHash + canonical JSON ────────
    @Test
    void ingestNewEvent_persistsRowWithHashAndCanonicalJson() throws Exception {
        JsonNode oldValues = objectMapper.readTree("{\"b\":2,\"a\":1}");
        JsonNode newValues = objectMapper.readTree("{\"status\":\"REL\"}");

        String eventId = ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "42",
                "RELEASE", "U1007", "corr-1", oldValues, newValues);

        Optional<AuditEvent> stored = repository.findById(eventId);
        assertThat(stored).isPresent();
        AuditEvent e = stored.get();

        assertThat(e.getRowHash()).matches("^[0-9a-f]{64}$");
        assertThat(e.getSource()).isEqualTo("LIVE");
        assertThat(e.getReceivedAt()).isNotNull();
        // Stored JSON is canonical: keys sorted, whitespace removed.
        assertThat(e.getOldValues()).isEqualTo("{\"a\":1,\"b\":2}");
        assertThat(e.getNewValues()).isEqualTo("{\"status\":\"REL\"}");
    }

    // ── 2. Duplicate eventId -> idempotent, no second row ──────────────────────
    @Test
    void duplicateEventId_isIdempotent() {
        String eventId = UUID.randomUUID().toString();

        IngestResult first = ingestService.ingest(request(eventId,
                AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "42", "CREATE", "U1", "c1"));
        IngestResult second = ingestService.ingest(request(eventId,
                AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "42", "CREATE", "U1", "c1"));

        assertThat(first.created()).isTrue();
        assertThat(second.created()).isFalse();

        AuditEventFilter filter = new AuditEventFilter();
        filter.setEntityType("BatchRecord");
        filter.setEntityId("42");
        Page<AuditEventResponse> page = queryService.search(filter, AuditRbac.ROLE_ADMIN);
        assertThat(page.getTotalElements()).isEqualTo(1);
    }

    // ── 3. Query by module ─────────────────────────────────────────────────────
    @Test
    void queryByModule() {
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "1", "CREATE", "U1", "c1", null, null);
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "2", "UPDATE", "U1", "c2", null, null);
        ingest(AuditRbac.MODULE_CLINICAL_TRIAL, "TrialProtocol", "9", "APPROVE", "U2", "c3", null, null);

        AuditEventFilter filter = new AuditEventFilter();
        filter.setModule(AuditRbac.MODULE_BATCH_MANUFACTURING);
        Page<AuditEventResponse> page = queryService.search(filter, AuditRbac.ROLE_ADMIN);

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent())
                .allMatch(r -> AuditRbac.MODULE_BATCH_MANUFACTURING.equals(r.getModule()));
    }

    // ── 4. Query by entityType + entityId ──────────────────────────────────────
    @Test
    void queryByEntityTypeAndEntityId() {
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "42", "RELEASE", "U1", "c1", null, null);
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "99", "RELEASE", "U1", "c2", null, null);

        AuditEventFilter filter = new AuditEventFilter();
        filter.setEntityType("BatchRecord");
        filter.setEntityId("42");
        Page<AuditEventResponse> page = queryService.search(filter, AuditRbac.ROLE_ADMIN);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getEntityId()).isEqualTo("42");
    }

    // ── 5. Query by performedBy ────────────────────────────────────────────────
    @Test
    void queryByPerformedBy() {
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "1", "CREATE", "U1007", "c1", null, null);
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "2", "CREATE", "U2008", "c2", null, null);

        AuditEventFilter filter = new AuditEventFilter();
        filter.setPerformedBy("U1007");
        Page<AuditEventResponse> page = queryService.search(filter, AuditRbac.ROLE_ADMIN);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getPerformedBy()).isEqualTo("U1007");
    }

    // ── 6. Query by correlationId ──────────────────────────────────────────────
    @Test
    void queryByCorrelationId() {
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "1", "CREATE", "U1", "corr-abc", null, null);
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "2", "CREATE", "U1", "corr-xyz", null, null);

        AuditEventFilter filter = new AuditEventFilter();
        filter.setCorrelationId("corr-abc");
        Page<AuditEventResponse> page = queryService.search(filter, AuditRbac.ROLE_ADMIN);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getCorrelationId()).isEqualTo("corr-abc");
    }

    // ── 7. Summary counts ──────────────────────────────────────────────────────
    @Test
    void summaryCounts() {
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "1", "CREATE", "U1", "c1", null, null);
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "2", "UPDATE", "U1", "c2", null, null);
        ingest(AuditRbac.MODULE_CLINICAL_TRIAL, "TrialProtocol", "9", "APPROVE", "U2", "c3", null, null);

        AuditSummaryResponse summary = queryService.getSummary(AuditRbac.ROLE_ADMIN);

        assertThat(summary.getCountsByModule())
                .containsEntry(AuditRbac.MODULE_BATCH_MANUFACTURING, 2L)
                .containsEntry(AuditRbac.MODULE_CLINICAL_TRIAL, 1L);
        assertThat(summary.getCountsByAction())
                .containsEntry("CREATE", 1L)
                .containsEntry("UPDATE", 1L)
                .containsEntry("APPROVE", 1L);
    }

    // ── 8. Module-scoped visibility ────────────────────────────────────────────
    @Test
    void moduleScopedVisibility() {
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "1", "CREATE", "U1", "c1", null, null);
        ingest(AuditRbac.MODULE_CLINICAL_TRIAL, "TrialProtocol", "9", "APPROVE", "U2", "c2", null, null);

        AuditEventFilter filter = new AuditEventFilter();

        // Admin -> all modules
        assertThat(queryService.search(filter, AuditRbac.ROLE_ADMIN).getTotalElements()).isEqualTo(2);

        // Investigator -> only ClinicalTrial / SubjectEnrollment
        Page<AuditEventResponse> investigator = queryService.search(filter, AuditRbac.ROLE_INVESTIGATOR);
        assertThat(investigator.getTotalElements()).isEqualTo(1);
        assertThat(investigator.getContent().get(0).getModule())
                .isEqualTo(AuditRbac.MODULE_CLINICAL_TRIAL);

        // Unknown role -> nothing
        assertThat(queryService.search(filter, "Unknown").getTotalElements()).isZero();
    }

    // ── Pagination ─────────────────────────────────────────────────────────────
    @Test
    void paginationBehavior() {
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "1", "CREATE", "U1", "c1", null, null);
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "2", "CREATE", "U1", "c2", null, null);
        ingest(AuditRbac.MODULE_BATCH_MANUFACTURING, "BatchRecord", "3", "CREATE", "U1", "c3", null, null);

        AuditEventFilter filter = new AuditEventFilter();
        filter.setModule(AuditRbac.MODULE_BATCH_MANUFACTURING);
        filter.setPage(0);
        filter.setSize(2);

        Page<AuditEventResponse> page = queryService.search(filter, AuditRbac.ROLE_ADMIN);
        assertThat(page.getTotalElements()).isEqualTo(3);
        assertThat(page.getTotalPages()).isEqualTo(2);
        assertThat(page.getContent()).hasSize(2);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private String ingest(String module, String entityType, String entityId, String action,
                          String performedBy, String correlationId, JsonNode oldV, JsonNode newV) {
        String eventId = UUID.randomUUID().toString();
        AuditEventRequest r = request(eventId, module, entityType, entityId, action, performedBy, correlationId);
        r.setOldValues(oldV);
        r.setNewValues(newV);
        ingestService.ingest(r);
        return eventId;
    }

    private AuditEventRequest request(String eventId, String module, String entityType, String entityId,
                                      String action, String performedBy, String correlationId) {
        AuditEventRequest r = new AuditEventRequest();
        r.setEventId(eventId);
        r.setModule(module);
        r.setEntityType(entityType);
        r.setEntityId(entityId);
        r.setAction(action);
        r.setPerformedBy(performedBy);
        r.setPerformedByName("Test User");
        r.setPerformedAt(LocalDateTime.now());
        r.setCorrelationId(correlationId);
        return r;
    }
}
