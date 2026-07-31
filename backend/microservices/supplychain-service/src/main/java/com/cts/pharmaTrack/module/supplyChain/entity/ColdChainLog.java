package com.cts.pharmaTrack.module.supplyChain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "cold_chain_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ColdChainLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "logId")
    private int logId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "shipmentId", nullable = false)
    private DrugShipment shipment;

    public int getShipmentId() {
        return shipment != null ? shipment.getShipmentId() : 0;
    }

    @Column(name = "recordedAt", nullable = false)
    private LocalDateTime recordedAt;

    @Column(name = "temperature", nullable = false, precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(name = "minThreshold", nullable = false, precision = 5, scale = 2)
    private BigDecimal minThreshold;

    @Column(name = "maxThreshold", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxThreshold;

    @Column(name = "excursionFlag")
    private Boolean excursionFlag;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ColdChainStatus status;

    public enum ColdChainStatus {
        Normal, Excursion
    }
}