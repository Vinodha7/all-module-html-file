package com.cts.pharmaTrack.module.batchManufacturing.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Outbound representation of a batch record.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BatchRecordResponse {

    private int batchId;
    private int productId;
    private String batchNumber;
    private LocalDate manufacturingDate;
    private LocalDate expiryDate;
    private double quantityManufactured;
    private String unit;
    private int manufacturingSiteId;
    private String status;
    private String supervisorName;
}
