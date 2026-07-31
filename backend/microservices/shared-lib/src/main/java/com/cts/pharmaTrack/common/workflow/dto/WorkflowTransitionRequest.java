package com.cts.pharmaTrack.common.workflow.dto;

import lombok.Getter;
import lombok.Setter;

/**
 * Body of {@code POST /workflow/transition} (Wave 4). The actor is taken from the
 * JWT, never the body.
 */
@Getter
@Setter
public class WorkflowTransitionRequest {
    private String entityType;
    private String entityId;
    private String targetStatus;
    private String reason;
}
