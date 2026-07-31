package com.cts.pharmaTrack.common.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Tamper-evident audit record written to each service's own {@code audit_log}
 * table. Captures who did what, to which record, when, and why — the core of a
 * 21 CFR Part 11-aligned electronic audit trail. Rows are insert-only (never
 * updated or deleted by the application).
 */
@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "auditId")
    private Long auditId;

    /** Authenticated principal (email) that performed the action. */
    @Column(name = "userId", length = 100)
    private String userId;

    /** CREATE / UPDATE / DELETE (derived from the HTTP method). */
    @Column(name = "action", length = 20)
    private String action;

    /** Logical entity affected (derived from the controller). */
    @Column(name = "entityType", length = 100)
    private String entityType;

    /** Best-effort identifier of the affected record (id param or URI). */
    @Column(name = "recordId", length = 200)
    private String recordId;

    /** Reason for change, supplied via the {@code X-Audit-Reason} header. */
    @Column(name = "reason", length = 500)
    private String reason;

    /** Request endpoint, for traceability. */
    @Column(name = "endpoint", length = 300)
    private String endpoint;

    /** Source module — ClinicalTrial, BatchManufacturing, ... (21 CFR Part 11). */
    @Column(name = "module", length = 100)
    private String module;

    /** Previous value before the change (Update actions). */
    @Column(name = "oldValue", columnDefinition = "TEXT")
    private String oldValue;

    /** New value after the change. */
    @Column(name = "newValue", columnDefinition = "TEXT")
    private String newValue;

    /** Session that performed the action, when known. */
    @Column(name = "sessionId")
    private Integer sessionId;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;

    /** SHA-256 of the canonical row content — set on persist, never updated. */
    @Column(name = "checksum", length = 255, updatable = false)
    private String checksum;

    /** Canonical, order-stable representation used for the integrity checksum. */
    public static String canonicalString(AuditLog l) {
        return String.join("|",
                String.valueOf(l.userId), String.valueOf(l.action),
                String.valueOf(l.entityType), String.valueOf(l.module),
                String.valueOf(l.recordId), String.valueOf(l.reason),
                String.valueOf(l.oldValue), String.valueOf(l.newValue),
                String.valueOf(l.endpoint),
                l.timestamp == null ? "null" : l.timestamp.truncatedTo(ChronoUnit.SECONDS).toString());
    }

    @PrePersist
    private void computeChecksum() {
        if (this.timestamp == null) this.timestamp = LocalDateTime.now();
        this.checksum = ChecksumUtil.sha256(canonicalString(this));
    }
}
