package com.cts.pharmaTrack.module.audit.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Query filter for {@code GET /events}. All predicate fields are optional; the
 * query service (A12) combines whichever are present. {@code page}/{@code size}
 * carry safe defaults and bounds. Module-scoping (RBAC) is applied by the query
 * service on top of these filters, not here.
 */
@Data
public class AuditEventFilter {

    private String module;
    private String action;
    private String entityType;
    private String entityId;
    private String performedBy;
    private String correlationId;

    /** Inclusive lower bound on performedAt. */
    private LocalDateTime from;

    /** Inclusive upper bound on performedAt. */
    private LocalDateTime to;

    @Min(0)
    private int page = 0;

    @Min(1)
    @Max(200)
    private int size = 20;
}
