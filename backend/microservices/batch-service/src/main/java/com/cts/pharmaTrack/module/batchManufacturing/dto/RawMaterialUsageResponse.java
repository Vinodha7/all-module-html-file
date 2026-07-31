package com.cts.pharmaTrack.module.batchManufacturing.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Outbound representation of a raw material usage record.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RawMaterialUsageResponse {

    private int usageId;
    private int batchId;
    private String materialName;
    private String materialLotNumber;
    private double quantityUsed;
    private String unit;
    private String status;
}
