package com.cts.pharmaTrack.common.audit;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Producer-side wire payload for the central Audit Service ingest endpoint
 * ({@code POST /pharmaTrack/audit/events}). Field names and types mirror the
 * Audit Service's {@code AuditEventRequest} exactly so the JSON binds one-to-one
 * — the server sets {@code receivedAt}, {@code source}, and {@code rowHash}, which
 * are intentionally absent here.
 *
 * <p>Lives in {@code pharmatrack-common} (not in the Audit Service) because it is
 * the contract producers serialize; the Audit Service keeps its own request DTO.
 * {@code oldValues}/{@code newValues} are typed as {@link Object} so a producer
 * may pass either structured JSON or a plain string — the server accepts arbitrary
 * JSON for both.
 */
@Getter
@Setter
@NoArgsConstructor
public class CentralAuditEvent {

    /** Producer-supplied UUID; primary key + idempotency key on the server. */
    private String eventId;

    private String module;

    private String entityType;

    private String entityId;

    private String action;

    /** Stable id of the actor (falls back to the actor's email when unknown). */
    private String performedBy;

    /** Display name of the actor at the time of the action. */
    private String performedByName;

    private LocalDateTime performedAt;

    /** Before-image (nullable); arbitrary JSON or a string. */
    private Object oldValues;

    /** After-image (nullable); arbitrary JSON or a string. */
    private Object newValues;

    private String ipAddress;

    private String correlationId;
}
