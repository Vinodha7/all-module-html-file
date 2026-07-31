package com.cts.pharmaTrack.module.supplyChain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "drug_shipment")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DrugShipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "shipmentId")
    private int shipmentId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "batchId", nullable = false)
    private BatchRecord batch;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "fromSiteId", nullable = false)
    private Site fromSite;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "toSiteId", nullable = false)
    private Site toSite;

    @Column(name = "shipmentDate", nullable = false)
    private LocalDate shipmentDate;

    @Column(name = "quantityShipped", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityShipped;

    @Column(name = "unit", nullable = false, length = 50)
    private String unit;

    @Column(name = "carrierName", nullable = false, length = 100)
    private String carrierName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ShipmentStatus status;

    public enum ShipmentStatus {
        Dispatched, InTransit, Delivered, Lost, Rejected
    }

    public int getBatchId() {
        return batch != null ? batch.getBatchId() : 0;
    }

    public int getFromSiteId() {
        return fromSite != null ? fromSite.getSiteId() : 0;
    }

    public int getToSiteId() {
        return toSite != null ? toSite.getSiteId() : 0;
    }
}