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
 * A tracked milestone (authority query, response, approval, etc.) against a
 * {@link RegulatoryDossier}.
 *
 * <p>Maps to the {@code regulatory_milestone} table. The primary key
 * {@code milestoneId} is a client-supplied string (e.g. {@code MS001}). The
 * milestone date is stored in {@code milestoneDate} (avoids the reserved
 * word {@code date}).
 */
@Entity
@Table(name = "regulatory_milestone")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegulatoryMilestone {

    @Id
    @Column(name = "milestoneId", length = 20)
    private String milestoneId;

    @Column(name = "dossierId", nullable = false, length = 20)
    private String dossierId;

    /** QueryReceived / ResponseSubmitted / ClockStop / Approval / Rejection */
    @Column(name = "milestoneType", length = 30)
    private String milestoneType;

    @Column(name = "milestoneDate")
    private LocalDate milestoneDate;

    @Column(name = "notes", length = 2000)
    private String notes;

    /** Completed / Pending */
    @Column(name = "status", length = 20)
    private String status;
}
