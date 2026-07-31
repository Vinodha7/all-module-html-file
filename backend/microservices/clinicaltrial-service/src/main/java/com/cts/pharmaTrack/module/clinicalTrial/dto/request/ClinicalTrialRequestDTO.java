package com.cts.pharmaTrack.module.clinicalTrial.dto.request;

import com.cts.pharmaTrack.module.clinicalTrial.enums.Phase;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
public class ClinicalTrialRequestDTO {

    private String trialCode;
    private int productId;
    private Phase phase;
    private String indication;
    private int plannedSubjects;
    private LocalDate startDate;
    private LocalDate endDate;
    private int principalInvestigatorId;
}