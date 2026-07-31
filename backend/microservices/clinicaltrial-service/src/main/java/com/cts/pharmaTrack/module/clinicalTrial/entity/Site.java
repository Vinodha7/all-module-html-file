package com.cts.pharmaTrack.module.clinicalTrial.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "site", schema = "pharmatrack_iam_ms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Site {

    @Id
    @Column(name = "siteId")
    private Integer siteId;

    @Column(name = "siteName")
    private String siteName;

    @Column(name = "country")
    private String country;
}
