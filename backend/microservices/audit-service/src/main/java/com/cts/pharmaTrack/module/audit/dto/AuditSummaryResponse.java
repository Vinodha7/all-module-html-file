package com.cts.pharmaTrack.module.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Aggregated audit counts for {@code GET /summary}: event counts grouped by
 * module and by action (within the caller's permitted scope, applied by A12).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditSummaryResponse {

    /** Event count per module. */
    private Map<String, Long> countsByModule;

    /** Event count per action. */
    private Map<String, Long> countsByAction;
}
