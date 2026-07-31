package com.cts.pharmaTrack.module.subjectEnrolment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Inbound payload for creating or updating a visit record.
 * {@code visitId} is the client-supplied primary key (e.g. {@code VIS001})
 * and is required on both create and update.
 */
@Getter
@Setter
public class VisitRecordRequest {

    @NotBlank(message = "visitId is required")
    private String visitId;

    @jakarta.validation.constraints.NotNull(message = "subjectId is required")
    private Integer subjectId;

    private String visitType;

    private LocalDate scheduledDate;

    private LocalDate actualDate;

    private String observations;

    private Boolean sampleCollected;

    private java.util.List<String> sampleTypes;

    private String status;
}
