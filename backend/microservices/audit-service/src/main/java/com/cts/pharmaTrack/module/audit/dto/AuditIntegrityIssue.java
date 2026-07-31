package com.cts.pharmaTrack.module.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single problematic row in an integrity report: either TAMPERED or
 * UNVERIFIABLE. VERIFIED rows are not listed (only counted).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditIntegrityIssue {

    private String eventId;
    private String module;
    private IntegrityStatus status;

    /** Explanation for UNVERIFIABLE rows (null for TAMPERED). */
    private String reason;

    /** The stored hash (present for TAMPERED; may be null for UNVERIFIABLE). */
    private String storedHash;

    /** The recomputed hash (present for TAMPERED; null otherwise). */
    private String recomputedHash;
}
