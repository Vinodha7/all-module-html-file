package com.cts.pharmaTrack.module.subjectEnrolment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Outbound representation of a visit record.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VisitRecordResponse {

    private String visitId;
    private Integer subjectId;
    private String visitType;
    private LocalDate scheduledDate;
    private LocalDate actualDate;
    private String conductedById;
    private String observations;
    private Boolean sampleCollected;
    private java.util.List<String> sampleTypes;
    private String status;
}
