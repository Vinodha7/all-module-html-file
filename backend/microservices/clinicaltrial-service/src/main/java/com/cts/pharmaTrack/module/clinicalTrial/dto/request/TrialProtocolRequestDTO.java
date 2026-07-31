package com.cts.pharmaTrack.module.clinicalTrial.dto.request;

import com.cts.pharmaTrack.module.clinicalTrial.enums.ProtocolStatus;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@NoArgsConstructor
public class TrialProtocolRequestDTO {

    private String versionNumber;
    private String inclusionCriteria;
    private String exclusionCriteria;
    private String endpoints;
    private LocalDate effectiveDate;
    private ProtocolStatus status;
}
