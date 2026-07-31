package com.cts.pharmaTrack.module.audit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Ingest payload for {@code POST /events}. Carries the producer-supplied fields
 * only; the server sets {@code receivedAt}, {@code source}, and {@code rowHash}
 * (which are intentionally absent here).
 */
@Data
public class AuditEventRequest {

    /** Producer-supplied UUID; primary key + idempotency key. */
    @NotBlank
    @Size(max = 36)
    private String eventId;

    @NotBlank
    @Size(max = 64)
    private String module;

    @NotBlank
    @Size(max = 100)
    private String entityType;

    @Size(max = 200)
    private String entityId;

    @NotBlank
    @Size(max = 32)
    private String action;

    @NotBlank
    @Size(max = 100)
    private String performedBy;

    @Size(max = 200)
    private String performedByName;

    @NotNull
    private LocalDateTime performedAt;

    /**
     * Before-image as arbitrary JSON (nullable). Typed as {@link Object} — not a
     * specific {@code JsonNode} — so the field binds under either Jackson version
     * the HTTP layer uses (Boot 4 uses Jackson 3); the value is a
     * Map/List/String/Number/Boolean as bound by the JSON deserializer.
     */
    private Object oldValues;

    /** After-image as arbitrary JSON (nullable). See {@link #oldValues}. */
    private Object newValues;

    @Size(max = 64)
    private String ipAddress;

    @Size(max = 36)
    private String correlationId;
}
