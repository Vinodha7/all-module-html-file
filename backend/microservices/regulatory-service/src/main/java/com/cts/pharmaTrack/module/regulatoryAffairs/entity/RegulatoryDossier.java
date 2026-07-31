package com.cts.pharmaTrack.module.regulatoryAffairs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * A regulatory submission dossier for a product in a target market.
 *
 * <p>Maps to the {@code regulatory_dossier} table. The primary key
 * {@code dossierId} is a client-supplied string (e.g. {@code DOS001}).
 */
@Entity
@Table(name = "regulatory_dossier")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegulatoryDossier {

    @Id
    @Column(name = "dossierId", length = 20)
    private String dossierId;

    @Column(name = "productId", nullable = false, length = 20)
    private String productId;

    /** IND / NDA / ANDA / CTD / Variation */
    @Column(name = "submissionType", length = 20)
    private String submissionType;

    @Column(name = "targetMarket", length = 100)
    private String targetMarket;

    @Column(name = "submissionDate")
    private LocalDate submissionDate;

    @Column(name = "assignedOfficerId", length = 20)
    private String assignedOfficerId;

    /** InPreparation / Submitted / UnderReview / Approved / Rejected / Withdrawn */
    @Column(name = "status", length = 20)
    private String status;
}
