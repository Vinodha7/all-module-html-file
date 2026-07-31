package com.cts.pharmaTrack.module.batchManufacturing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

/**
 * Inbound payload for creating or updating a raw material usage record.
 * The primary key ({@code usageId}) and lifecycle {@code status} are managed
 * by the server and are not accepted from the client.
 */
@Getter
@Setter
public class RawMaterialUsageRequest {

    @NotNull(message = "batchId is required")
    private Integer batchId;

    @NotBlank(message = "materialName is required")
    private String materialName;

    @NotBlank(message = "materialLotNumber is required")
    private String materialLotNumber;

    @NotNull(message = "quantityUsed is required")
    @Positive(message = "quantityUsed must be greater than zero")
    private Double quantityUsed;

    private String unit;
}
