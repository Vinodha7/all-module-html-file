package com.cts.pharmaTrack.module.supplyChain.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SiteInventoryRequestDTO {
    private Integer siteId;
    private Integer batchId;
    private BigDecimal quantityReceived;
    private BigDecimal quantityDispensed;
    private String storageCondition;
}