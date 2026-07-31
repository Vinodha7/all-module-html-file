package com.cts.pharmaTrack.module.subjectEnrolment.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Inbound payload for creating or updating an adverse event.
 * {@code aeId} is the client-supplied primary key (e.g. {@code AE001})
 * and is required on both create and update.
 */
@Getter
@Setter
public class AdverseEventRequest {

    @NotBlank(message = "aeId is required")
    private String aeId;

    @jakarta.validation.constraints.NotNull(message = "subjectId is required")
    private Integer subjectId;

    @NotBlank(message = "visitId is required")
    private String visitId;

    private String description;

    private String severity;

    private String relatedness;

    private LocalDate onsetDate;

    private LocalDate resolutionDate;

    private String status;
}
