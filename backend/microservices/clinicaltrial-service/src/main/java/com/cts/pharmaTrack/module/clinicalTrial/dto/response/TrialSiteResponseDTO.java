package com.cts.pharmaTrack.module.clinicalTrial.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class TrialSiteResponseDTO {

    private int trialSiteId;
    private Integer siteId;
    private int trialId;
    private String siteName;
    private String country;
    private int principalInvestigatorId;
    private int plannedSubjects;
    private String status;
    private String message;
}