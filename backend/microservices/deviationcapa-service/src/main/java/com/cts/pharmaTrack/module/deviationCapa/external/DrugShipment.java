package com.cts.pharmaTrack.module.deviationCapa.external;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "drug_shipment", schema = "pharmatrack_supplychain")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DrugShipment {

    @Id
    @Column(name = "shipmentId")
    private Integer shipmentId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "batchId", nullable = false)
    private BatchRecord batch;
}
