package com.cts.pharmaTrack.module.supplyChain.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "batch_record", schema = "pharmatrack_batch")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchRecord {

    @Id
    @Column(name = "batchId")
    private Integer batchId;

    @Column(name = "batchNumber")
    private String batchNumber;

    @Column(name = "quantityManufactured")
    private Double quantityManufactured;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "productId", nullable = false)
    private Product product;
}
