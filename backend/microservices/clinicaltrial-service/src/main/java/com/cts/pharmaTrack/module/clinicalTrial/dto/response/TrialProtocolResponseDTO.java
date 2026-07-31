package com.cts.pharmaTrack.module.clinicalTrial.dto.response;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class TrialProtocolResponseDTO {

    private int protocolId;
    private int trialId;
    private String versionNumber;
    private String inclusionCriteria;
    private String exclusionCriteria;
    private String endpoints;
    private String effectiveDate;
    private String status;
    private String message;
}