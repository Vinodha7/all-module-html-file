package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "product")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "productId")
    private Integer productId;

    @Column(name = "productName", nullable = false, length = 150)
    private String productName;

    @Column(name = "storageCondition", nullable = false, length = 100)
    private String storageCondition;

    @Column(name = "minThreshold", nullable = false)
    private Double minThreshold;

    @Column(name = "maxThreshold", nullable = false)
    private Double maxThreshold;
}
