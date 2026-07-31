package com.cts.pharmaTrack.module.audit.service;

import com.cts.pharmaTrack.module.audit.dto.AuditEventRequest;
import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import com.cts.pharmaTrack.module.audit.repository.AuditEventRepository;
import com.cts.pharmaTrack.module.audit.util.AuditCanonicalizer;
import com.cts.pharmaTrack.module.audit.util.AuditHashService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Ingests audit events: validates, dedupes on {@code eventId}, stamps server
 * metadata, canonicalizes JSON payloads, computes the keyed HMAC {@code rowHash},
 * and appends the row.
 *
 * <p>Insert-only and idempotent — a previously seen {@code eventId} returns
 * success without inserting a second row. There is no update or delete path.
 */
@Service
public class AuditIngestService {

    private static final String SOURCE_LIVE = "LIVE";

    private final AuditEventRepository repository;
    private final AuditCanonicalizer canonicalizer;
    private final AuditHashService hashService;

    public AuditIngestService(AuditEventRepository repository,
                              AuditCanonicalizer canonicalizer,
                              AuditHashService hashService) {
        this.repository = repository;
        this.canonicalizer = canonicalizer;
        this.hashService = hashService;
    }

    /**
     * Appends an audit event. Returns {@code created=true} when a new row was
     * inserted, or {@code created=false} when the {@code eventId} already existed
     * (idempotent no-op).
     */
    @Transactional
    public IngestResult ingest(AuditEventRequest request) {
        validate(request);

        // Fast-path dedupe: known eventId -> idempotent success, no second row.
        if (repository.existsById(request.getEventId())) {
            return new IngestResult(request.getEventId(), false);
        }

        AuditEvent event = toEntity(request);
        event.setReceivedAt(LocalDateTime.now());
        event.setSource(SOURCE_LIVE);
        event.setRowHash(hashService.hash(event));

        try {
            AuditEvent saved = repository.save(event);
            return new IngestResult(saved.getEventId(), true);
        } catch (DataIntegrityViolationException e) {
            // Concurrent insert of the same eventId won the race between the
            // existsById check and save -> treat as idempotent success.
            return new IngestResult(request.getEventId(), false);
        }
    }

    private AuditEvent toEntity(AuditEventRequest r) {
        AuditEvent e = new AuditEvent();
        e.setEventId(r.getEventId());
        e.setModule(r.getModule());
        e.setEntityType(r.getEntityType());
        e.setEntityId(r.getEntityId());
        e.setAction(r.getAction());
        e.setPerformedBy(r.getPerformedBy());
        e.setPerformedByName(r.getPerformedByName());
        e.setPerformedAt(r.getPerformedAt());
        e.setOldValues(toStoredJson(r.getOldValues()));
        e.setNewValues(toStoredJson(r.getNewValues()));
        e.setIpAddress(r.getIpAddress());
        e.setCorrelationId(r.getCorrelationId());
        return e;
    }

    /**
     * Absent JSON is stored as SQL NULL; present JSON is stored in canonical form
     * (never the canonicalizer's null token, which is not valid JSON). The value
     * is whatever the JSON deserializer bound at the HTTP boundary
     * (Map/List/String/Number/Boolean).
     */
    private String toStoredJson(Object value) {
        if (value == null) {
            return null;
        }
        return canonicalizer.canonicalizeJson(value);
    }

    private void validate(AuditEventRequest r) {
        requireText(r.getEventId(), "eventId");
        requireText(r.getModule(), "module");
        requireText(r.getEntityType(), "entityType");
        requireText(r.getAction(), "action");
        requireText(r.getPerformedBy(), "performedBy");
        if (r.getPerformedAt() == null) {
            throw new IllegalArgumentException("performedAt is required");
        }
    }

    private static void requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
    }

    /** Outcome of an ingest: the event id and whether a new row was created. */
    public record IngestResult(String eventId, boolean created) {
    }
}
