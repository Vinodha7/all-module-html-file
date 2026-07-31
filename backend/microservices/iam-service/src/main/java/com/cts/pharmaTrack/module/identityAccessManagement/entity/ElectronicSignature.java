package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 21 CFR Part 11 electronic signature.
 *
 * <p><strong>Legacy (Wave &lt; 3):</strong> a signature applied to an audit-log
 * entry — {@code auditId} is populated and the entity linkage columns are null.
 *
 * <p><strong>Wave 3 (entity-based):</strong> a signature applied to a business
 * record in an approval workflow — {@code entityType} + {@code entityId} +
 * {@code entityVersion} are populated and {@code auditId} is null. The
 * {@code signatureHash} binds {@code userId + entityType + entityId +
 * entityVersion + meaning + signedAt} so the signature proves <em>who</em> signed,
 * <em>what</em> was signed and <em>which version</em>, and is tamper-evident and
 * non-repudiable.
 *
 * <p>Both shapes coexist in the one table; the columns added in Wave 3 are
 * nullable so historical legacy rows remain valid (see the migration in
 * {@code db/wave3-electronic-signature.sql}).
 */
@Entity
@Table(name = "electronic_signature")
@Data
public class ElectronicSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer signatureId;

    /** Legacy linkage: the audit-log row this signature attests to (null for Wave 3 rows). */
    @Column
    private Integer auditId;

    /** The authenticated signer's user id (always from the JWT principal, never the request body). */
    @Column(nullable = false)
    private Integer userId;

    /** Display name of the signer captured at signing time (not part of the hash). */
    @Column(length = 150)
    private String signerName;

    // ── Wave 3 entity linkage (null for legacy audit-log signatures) ────────────
    /** Business entity type signed, e.g. {@code TrialProtocol}, {@code RegulatorySubmission}. */
    @Column(length = 100)
    private String entityType;

    /** Business entity id signed. */
    @Column(length = 100)
    private String entityId;

    /** Version of the entity signed, e.g. a protocol {@code version_number}. */
    @Column(length = 50)
    private String entityVersion;

    @Column(updatable = false)
    private LocalDateTime signedAt = LocalDateTime.now();

    @Column(length = 255, nullable = false)
    private String signatureHash;

    /**
     * What the signature represents. Legacy rows hold free text; Wave 3 rows hold
     * a {@link SignatureMeaning} name (APPROVED, REVIEWED, REJECTED, RELEASED).
     */
    @Column(length = 200, nullable = false)
    private String meaning;
}
