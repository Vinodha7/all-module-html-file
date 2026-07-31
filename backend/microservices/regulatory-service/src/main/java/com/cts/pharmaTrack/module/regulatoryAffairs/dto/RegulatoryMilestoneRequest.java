package com.cts.pharmaTrack.module.regulatoryAffairs.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Inbound payload for creating or updating a regulatory milestone.
 * {@code milestoneId} is the client-supplied primary key (e.g. {@code MS001}).
 */
@Getter
@Setter
public class RegulatoryMilestoneRequest {

    @NotBlank(message = "milestoneId is required")
    private String milestoneId;

    @NotBlank(message = "dossierId is required")
    private String dossierId;

    private String milestoneType;

    private LocalDate milestoneDate;

    private String notes;

    private String status;
}
