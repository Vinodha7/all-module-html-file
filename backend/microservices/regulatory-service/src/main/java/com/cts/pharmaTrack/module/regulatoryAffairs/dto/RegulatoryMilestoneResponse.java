package com.cts.pharmaTrack.module.regulatoryAffairs.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Outbound representation of a regulatory milestone.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class RegulatoryMilestoneResponse {

    private String milestoneId;
    private String dossierId;
    private String milestoneType;
    private LocalDate milestoneDate;
    private String notes;
    private String status;
}
