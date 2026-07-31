package com.cts.pharmaTrack.module.regulatoryAffairs.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Inbound payload for creating or updating a regulatory dossier.
 * {@code dossierId} is the client-supplied primary key (e.g. {@code DOS001}).
 */
@Getter
@Setter
public class RegulatoryDossierRequest {

    @NotBlank(message = "dossierId is required")
    private String dossierId;

    @NotBlank(message = "productId is required")
    private String productId;

    private String submissionType;

    private String targetMarket;

    private LocalDate submissionDate;

    private String assignedOfficerId;

    private String status;
}
