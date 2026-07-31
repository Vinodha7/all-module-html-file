package com.cts.pharmaTrack.module.deviationCapa.external;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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
}
