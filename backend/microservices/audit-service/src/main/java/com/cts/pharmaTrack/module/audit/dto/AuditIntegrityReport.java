package com.cts.pharmaTrack.module.audit.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Summary of an integrity verification pass over the audit ledger.
 *
 * <p>{@code intact} is true only when every row VERIFIED (no tampered and no
 * unverifiable rows). {@code issues} lists the tampered and unverifiable rows.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditIntegrityReport {

    private long total;
    private long verified;
    private long tampered;
    private long unverifiable;
    private boolean intact;
    private List<AuditIntegrityIssue> issues;
}
