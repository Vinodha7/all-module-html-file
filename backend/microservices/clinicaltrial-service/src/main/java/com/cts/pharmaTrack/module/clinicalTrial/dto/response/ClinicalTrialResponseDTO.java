package com.cts.pharmaTrack.module.clinicalTrial.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ClinicalTrialResponseDTO {

    private int trialId;
    private String trialCode;
    private int productId;
    private String phase;
    private String indication;
    private int plannedSubjects;
    private String startDate;
    private String endDate;
    private int principalInvestigatorId;
    private String status;
    private String message;
}