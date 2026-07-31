package com.cts.pharmaTrack.common.workflow.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Body of {@code GET /workflow/status/{entityType}/{entityId}} (Wave 4). */
@Getter
@AllArgsConstructor
public class WorkflowStatusResponse {
    private String entityType;
    private String entityId;
    private String currentStatus;
}
