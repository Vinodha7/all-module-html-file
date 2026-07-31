package com.cts.pharmaTrack.module.supplyChain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "product", schema = "pharmatrack_iam_ms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @Column(name = "productId")
    private Integer productId;

    @Column(name = "productName")
    private String productName;

    @Column(name = "storageCondition")
    private String storageCondition;

    @Column(name = "minThreshold")
    private Double minThreshold;

    @Column(name = "maxThreshold")
    private Double maxThreshold;
}
