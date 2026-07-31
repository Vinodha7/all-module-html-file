package com.cts.pharmaTrack.module.subjectEnrolment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Inbound payload for creating or updating a trial subject.
 * {@code subjectId} is the client-supplied primary key (e.g. {@code SUB001})
 * and is required on both create and update.
 */
@Getter
@Setter
public class TrialSubjectRequest {

    private Integer subjectId;

    @jakarta.validation.constraints.NotNull(message = "trialId is required")
    private Integer trialId;

    @jakarta.validation.constraints.NotNull(message = "siteId is required")
    private Integer siteId;

    @NotBlank(message = "subjectCode is required")
    private String subjectCode;

    private LocalDate dateOfBirth;

    private String gender;

    private LocalDate consentDate;

    private LocalDate enrolmentDate;

    private String status;
}
