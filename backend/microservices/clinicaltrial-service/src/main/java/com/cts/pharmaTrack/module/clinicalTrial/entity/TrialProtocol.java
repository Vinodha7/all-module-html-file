package com.cts.pharmaTrack.module.clinicalTrial.entity;

import com.cts.pharmaTrack.module.clinicalTrial.enums.ProtocolStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Entity
@Table(name = "trial_protocol")
@Data
@NoArgsConstructor
public class TrialProtocol {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "protocolId")
    private int protocolId;

    @Column(name = "trialId", nullable = false)
    private int trialId;

    @Column(name = "versionNumber", nullable = false, length = 20)
    private String versionNumber;

    @Column(name = "inclusionCriteria", nullable = false,
            columnDefinition = "TEXT")
    private String inclusionCriteria;

    @Column(name = "exclusionCriteria", nullable = false,
            columnDefinition = "TEXT")
    private String exclusionCriteria;

    @Column(name = "endpoints", nullable = false, columnDefinition = "TEXT")
    private String endpoints;

    // Effective date is optional (frontend leaves it blank for e.g. Draft protocols)
    @Column(name = "effectiveDate")
    private LocalDate effectiveDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ProtocolStatus status = ProtocolStatus.Draft;
}