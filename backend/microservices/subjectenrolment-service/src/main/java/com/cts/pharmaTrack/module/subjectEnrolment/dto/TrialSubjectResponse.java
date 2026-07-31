package com.cts.pharmaTrack.module.subjectEnrolment.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Outbound representation of a trial subject.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TrialSubjectResponse {

    private Integer subjectId;
    private Integer trialId;
    private Integer siteId;
    private String subjectCode;
    private LocalDate dateOfBirth;
    private String gender;
    private LocalDate consentDate;
    private LocalDate enrolmentDate;
    private String status;
}
