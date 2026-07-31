package com.cts.pharmaTrack.module.supplyChain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "site_inventory")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SiteInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "inventoryId")
    private int inventoryId;

    @Column(name = "siteId", nullable = false)
    private int siteId;

    @Column(name = "batchId", nullable = false)
    private int batchId;

    @Column(name = "quantityReceived", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityReceived;

    @Column(name = "quantityDispensed", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantityDispensed;

    @Column(name = "quantityOnHand", precision = 10, scale = 2)
    private BigDecimal quantityOnHand;

    @Column(name = "storageCondition", length = 100)
    private String storageCondition;

    @Column(name = "lastUpdated")
    private LocalDateTime lastUpdated;
}