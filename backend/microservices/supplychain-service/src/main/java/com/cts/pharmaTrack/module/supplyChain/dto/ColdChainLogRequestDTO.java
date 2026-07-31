package com.cts.pharmaTrack.module.supplyChain.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ColdChainLogRequestDTO {
    private int shipmentId;
    private LocalDateTime recordedAt;
    private BigDecimal temperature;
    private BigDecimal minThreshold;
    private BigDecimal maxThreshold;
}