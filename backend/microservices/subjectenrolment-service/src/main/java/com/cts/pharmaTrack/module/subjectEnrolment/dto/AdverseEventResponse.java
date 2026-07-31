package com.cts.pharmaTrack.module.subjectEnrolment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Outbound representation of an adverse event.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdverseEventResponse {

    private String aeId;
    private Integer subjectId;
    private String visitId;
    private String description;
    private String severity;
    private String relatedness;
    private LocalDate onsetDate;
    private LocalDate resolutionDate;
    private String reportedById;
    private String status;
}
