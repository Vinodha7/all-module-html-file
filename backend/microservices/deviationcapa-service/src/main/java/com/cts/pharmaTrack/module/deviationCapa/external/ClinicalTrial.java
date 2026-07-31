package com.cts.pharmaTrack.module.deviationCapa.external;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "clinical_trial", schema = "pharmatrack_clinicaltrial")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClinicalTrial {

    @Id
    @Column(name = "trialId")
    private Integer trialId;

    @Column(name = "trialCode")
    private String trialCode;
}
