package com.cts.pharmaTrack.module.batchManufacturing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Inbound payload for creating or updating a QC test.
 * The primary key ({@code testId}) and lifecycle {@code status} are managed
 * by the server and are not accepted from the client.
 */
@Getter
@Setter
public class QCTestRequest {

    @NotNull(message = "batchId is required")
    private Integer batchId;

    @NotBlank(message = "testType is required")
    private String testType;

    private Integer testedById;

    @NotNull(message = "testDate is required")
    private LocalDate testDate;

    private String result;

    private String specification;

    // Outcome supplied by the frontend (Pass / Fail / Retest).
    private String status;
}
