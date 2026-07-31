package com.cts.pharmaTrack.module.clinicalTrial.dto.request;

import com.cts.pharmaTrack.module.clinicalTrial.enums.SiteStatus;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class TrialSiteRequestDTO {

    private Integer siteId;
    private int principalInvestigatorId;
    private int plannedSubjects;
    private SiteStatus status;
}
