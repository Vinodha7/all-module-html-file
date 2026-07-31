package com.cts.pharmaTrack.common.workflow;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Immutable record of one workflow state change (Wave 4, requirement 5). One row
 * per transition, written by {@link WorkflowService}. Column names are declared
 * explicitly so the mapping is identical regardless of a service's physical
 * naming strategy.
 *
 * <p>Lives in {@code pharmatrack-common}; each owning service gets its own
 * {@code record_lifecycle_history} table (auto-created where {@code ddl-auto} is
 * {@code update}).
 */
@Entity
@Table(name = "record_lifecycle_history")
@Getter
@Setter
@NoArgsConstructor
public class RecordLifecycleHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "historyId")
    private Long historyId;

    @Column(name = "entityType", nullable = false, length = 100)
    private String entityType;

    @Column(name = "entityId", nullable = false, length = 100)
    private String entityId;

    @Column(name = "oldStatus", length = 50)
    private String oldStatus;

    @Column(name = "newStatus", nullable = false, length = 50)
    private String newStatus;

    /** Actor id (falls back to email) taken from the authenticated principal. */
    @Column(name = "changedBy", length = 150)
    private String changedBy;

    @Column(name = "changedAt", nullable = false, updatable = false)
    private LocalDateTime changedAt = LocalDateTime.now();

    /** Authorizing signature id for signature-gated transitions; null otherwise. */
    @Column(name = "signatureId")
    private Integer signatureId;

    /** Optional free-text reason-for-change supplied by the caller. */
    @Column(name = "reason", length = 500)
    private String reason;
}
