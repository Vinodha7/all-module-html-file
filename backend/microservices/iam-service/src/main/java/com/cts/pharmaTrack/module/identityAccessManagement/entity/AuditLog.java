package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import com.cts.pharmaTrack.module.identityAccessManagement.util.ChecksumUtil;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity(name = "IamAuditLog")
@Table(name = "audit_log")
@Data
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer auditId;

    @ManyToOne
    @JoinColumn(name = "userId", nullable = false)
    private UserDetails user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    @Column(length = 100)
    private String entityType;

    /** Source module that wrote this entry — IAM, ClinicalTrial, BatchManufacturing, ... */
    @Column(length = 100)
    private String module = "IAM";

    private Integer recordId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    /** Previous value of the record before the change (for Update actions). */
    @Column(columnDefinition = "TEXT")
    private String oldValue;

    /** New value of the record after the change. */
    @Column(columnDefinition = "TEXT")
    private String newValue;

    /** Session that performed the action, when known. */
    private Integer sessionId;

    @Column(length = 50)
    private String ipAddress;

    @Column(updatable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    /** SHA-256 of the canonical row content — set on persist, never updated (tamper detection). */
    @Column(length = 255, updatable = false)
    private String checksum;

    public enum AuditAction {
        Create, Update, Delete, Login, Logout,
        PasswordReset, ForceLogout, SessionDeactivated,
        Approve, Reject, Submit, Release, Read, Dismiss
    }

    /**
     * Canonical, order-stable representation of the row used for the integrity
     * checksum. Kept as a public static so the verification endpoint can
     * recompute it from a persisted entity and compare.
     */
    public static String canonicalString(AuditLog log) {
        Integer uid = (log.getUser() != null) ? log.getUser().getUserId() : null;
        return String.join("|",
                String.valueOf(uid),
                String.valueOf(log.getAction()),
                String.valueOf(log.getEntityType()),
                String.valueOf(log.getModule()),
                String.valueOf(log.getRecordId()),
                String.valueOf(log.getReason()),
                String.valueOf(log.getOldValue()),
                String.valueOf(log.getNewValue()),
                String.valueOf(log.getIpAddress()),
                log.getTimestamp() == null ? "null"
                        : log.getTimestamp().truncatedTo(ChronoUnit.SECONDS).toString());
    }

    @PrePersist
    private void computeChecksum() {
        if (this.module == null) this.module = "IAM";
        if (this.timestamp == null) this.timestamp = LocalDateTime.now();
        this.checksum = ChecksumUtil.sha256(canonicalString(this));
    }
}
