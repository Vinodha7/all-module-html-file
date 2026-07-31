package com.cts.pharmaTrack.module.regulatoryAffairs.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Outbound representation of a regulatory dossier.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegulatoryDossierResponse {

    private String dossierId;
    private String productId;
    private String submissionType;
    private String targetMarket;
    private LocalDate submissionDate;
    private String assignedOfficerId;
    private String status;
}
