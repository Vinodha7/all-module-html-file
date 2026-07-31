package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "site")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Site {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "siteId")
    private Integer siteId;

    @Column(name = "siteName", nullable = false, length = 150)
    private String siteName;

    @Column(name = "country", nullable = false, length = 100)
    private String country;
}
