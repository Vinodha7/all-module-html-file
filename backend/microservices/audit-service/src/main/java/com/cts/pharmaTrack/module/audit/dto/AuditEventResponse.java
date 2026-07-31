package com.cts.pharmaTrack.module.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Full audit event representation returned by the read endpoints — includes the
 * server-generated fields ({@code receivedAt}, {@code source}, {@code rowHash})
 * in addition to the producer-supplied fields.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditEventResponse {

    private String eventId;
    private String module;
    private String entityType;
    private String entityId;
    private String action;
    private String performedBy;
    private String performedByName;
    private LocalDateTime performedAt;
    private LocalDateTime receivedAt;
    // Object (not JsonNode) so the response serializes under Boot 4's Jackson 3;
    // holds the parsed stored JSON (Map/List/String/...).
    private Object oldValues;
    private Object newValues;
    private String ipAddress;
    private String correlationId;
    private String source;
    private String rowHash;
}
