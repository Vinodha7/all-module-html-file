package com.cts.pharmaTrack.module.supplyChain.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrugShipmentRequestDTO {
    private Integer batchId;
    private Integer fromSiteId;
    private Integer toSiteId;
    private LocalDate shipmentDate;
    private BigDecimal quantityShipped;
    private String unit;
    private String carrierName;
}
