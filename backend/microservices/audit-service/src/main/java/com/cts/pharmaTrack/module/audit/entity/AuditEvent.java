package com.cts.pharmaTrack.module.audit.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Immutable, insert-only audit event — the centralized "who did what, to which
 * record, when, and why" ledger row (21 CFR Part 11 aligned).
 *
 * <p>The primary key {@code eventId} is a producer-supplied UUID (used as an
 * idempotency key on ingest). {@code performedAt}, {@code receivedAt}, and
 * {@code rowHash} are mapped {@code updatable = false}; combined with the absence
 * of any {@code @PreUpdate}/{@code @PreRemove} lifecycle callbacks and an
 * insert/read-only repository (A6), the row is never mutated after insert.
 * Indexes are added in A5; the keyed HMAC {@code rowHash} is populated at ingest
 * (A9/A10).
 */
@Entity
@Table(name = "audit_event", indexes = {
        @Index(name = "idx_audit_module_performed_at", columnList = "module, performedAt"),
        @Index(name = "idx_audit_entity", columnList = "entityType, entityId"),
        @Index(name = "idx_audit_performed_by", columnList = "performedBy"),
        @Index(name = "idx_audit_action", columnList = "action"),
        @Index(name = "idx_audit_correlation_id", columnList = "correlationId")
})
@Getter
@Setter
@NoArgsConstructor
public class AuditEvent {

    /** Producer-supplied UUID; primary key and idempotency key. */
    @Id
    @Column(name = "eventId", length = 36, nullable = false, updatable = false)
    private String eventId;

    /** Canonical source module (e.g. BatchManufacturing, ClinicalTrial, CAPA). */
    @Column(name = "module", length = 64, nullable = false)
    private String module;

    /** Logical entity type affected (e.g. BatchRecord, CAPARecord). */
    @Column(name = "entityType", length = 100, nullable = false)
    private String entityType;

    /** Affected record identifier, as a String (supports numeric and codes like CAPA001). */
    @Column(name = "entityId", length = 200)
    private String entityId;

    /** Action performed (CREATE/UPDATE/DELETE/APPROVE/...). */
    @Column(name = "action", length = 32, nullable = false)
    private String action;

    /** Stable user id of the actor (not an FK, not an email). */
    @Column(name = "performedBy", length = 100, nullable = false)
    private String performedBy;

    /** Denormalized display name of the actor at the time of the action. */
    @Column(name = "performedByName", length = 200)
    private String performedByName;

    /** When the action occurred (producer clock). */
    @Column(name = "performedAt", nullable = false, updatable = false)
    private LocalDateTime performedAt;

    /** When the Audit Service persisted the event (consumer clock). */
    @Column(name = "receivedAt", nullable = false, updatable = false)
    private LocalDateTime receivedAt;

    /** Before-image as a JSON document. */
    @Column(name = "oldValues", columnDefinition = "json")
    private String oldValues;

    /** After-image as a JSON document. */
    @Column(name = "newValues", columnDefinition = "json")
    private String newValues;

    /** Client IP address, when known (IPv6-safe length). */
    @Column(name = "ipAddress", length = 64)
    private String ipAddress;

    /** Correlation id tying this event to a single business action. */
    @Column(name = "correlationId", length = 36)
    private String correlationId;

    /** Origin of the row: LIVE or LEGACY_BACKFILL. */
    @Column(name = "source", length = 20, nullable = false)
    private String source;

    /** Keyed HMAC-SHA256 (hex) of the canonical row content; tamper-evidence. */
    @Column(name = "rowHash", length = 64, nullable = false, updatable = false)
    private String rowHash;
}
