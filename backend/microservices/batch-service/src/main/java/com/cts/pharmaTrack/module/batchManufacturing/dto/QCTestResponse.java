package com.cts.pharmaTrack.module.batchManufacturing.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Outbound representation of a QC test.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class QCTestResponse {

    private int testId;
    private int batchId;
    private String testType;
    private int testedById;
    private LocalDate testDate;
    private String result;
    private String specification;
    private String status;
}
