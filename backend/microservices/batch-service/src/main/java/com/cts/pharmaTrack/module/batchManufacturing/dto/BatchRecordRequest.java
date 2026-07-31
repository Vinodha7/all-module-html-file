package com.cts.pharmaTrack.module.batchManufacturing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Inbound payload for creating or updating a batch record.
 * The primary key ({@code batchId}) and lifecycle {@code status} are managed
 * by the server and are not accepted from the client.
 */
@Getter
@Setter
public class BatchRecordRequest {

    @NotNull(message = "productId is required")
    private Integer productId;

    @NotBlank(message = "batchNumber is required")
    private String batchNumber;

    @NotNull(message = "manufacturingDate is required")
    private LocalDate manufacturingDate;

    @NotNull(message = "expiryDate is required")
    private LocalDate expiryDate;

    @NotNull(message = "quantityManufactured is required")
    @Positive(message = "quantityManufactured must be greater than zero")
    private Double quantityManufactured;

    private String unit;

    private Integer manufacturingSiteId;
}
