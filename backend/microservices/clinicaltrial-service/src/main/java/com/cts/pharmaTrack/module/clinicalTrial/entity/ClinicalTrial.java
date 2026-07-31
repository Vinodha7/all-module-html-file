package com.cts.pharmaTrack.module.clinicalTrial.entity;

import com.cts.pharmaTrack.module.clinicalTrial.enums.Phase;
import com.cts.pharmaTrack.module.clinicalTrial.enums.TrialStatus;
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
@Table(name = "clinical_trial")
@Data
@NoArgsConstructor
public class ClinicalTrial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trialId")
    private int trialId;

    @Column(name = "trialCode", nullable = false, unique = true, length = 50)
    private String trialCode;

    @Column(name = "productId", nullable = false)
    private int productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "phase", nullable = false)
    private Phase phase;

    @Column(name = "indication", nullable = false, length = 255)
    private String indication;

    @Column(name = "plannedSubjects", nullable = false)
    private int plannedSubjects;

    @Column(name = "startDate", nullable = false)
    private LocalDate startDate;

    @Column(name = "endDate")
    private LocalDate endDate;

    @Column(name = "principalInvestigatorId", nullable = false)
    private int principalInvestigatorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TrialStatus status = TrialStatus.Draft;
}