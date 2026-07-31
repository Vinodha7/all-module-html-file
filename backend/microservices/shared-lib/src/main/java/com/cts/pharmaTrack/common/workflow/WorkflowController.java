package com.cts.pharmaTrack.common.workflow;

import com.cts.pharmaTrack.common.exception.BadRequestException;
import com.cts.pharmaTrack.common.response.ApiResponse;
import com.cts.pharmaTrack.common.workflow.dto.WorkflowStatusResponse;
import com.cts.pharmaTrack.common.workflow.dto.WorkflowTransitionRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Generic Wave 4 workflow API, served by each business service for the entity
 * types it registers (via {@link WorkflowEntityHandler} beans). Workflow state
 * stays in each service; this controller is uniform across all of them.
 *
 * <ul>
 *   <li>{@code POST /workflow/transition}</li>
 *   <li>{@code GET  /workflow/history/{entityType}/{entityId}}</li>
 *   <li>{@code GET  /workflow/status/{entityType}/{entityId}}</li>
 * </ul>
 *
 * <p>The signer/actor is always the authenticated JWT principal. Transition
 * legality, role authorization and signature gating are enforced downstream;
 * rejections surface as 409 (invalid state) or 403 (role / missing signature).
 */
@RestController
@RequestMapping("/workflow")
public class WorkflowController {

    private final WorkflowManager workflowManager;

    public WorkflowController(WorkflowManager workflowManager) {
        this.workflowManager = workflowManager;
    }

    @PostMapping("/transition")
    public ResponseEntity<ApiResponse<Void>> transition(@RequestBody WorkflowTransitionRequest request) {
        if (!StringUtils.hasText(request.getEntityType())
                || !StringUtils.hasText(request.getEntityId())
                || !StringUtils.hasText(request.getTargetStatus())) {
            throw new BadRequestException("entityType, entityId and targetStatus are required");
        }
        String entityType = request.getEntityType().trim();
        String entityId = request.getEntityId().trim();
        String targetStatus = request.getTargetStatus().trim();
        // Performs the transition (state/role/signature validation + history + audit)
        // in one transaction; the recorded history is available via GET /workflow/history.
        workflowManager.transition(entityType, entityId, targetStatus, request.getReason());
        String message = "Workflow transition to '" + targetStatus + "' recorded for "
                + entityType + " " + entityId;
        return ResponseEntity.ok(ApiResponse.message(message));
    }

    @GetMapping("/history/{entityType}/{entityId}")
    public ResponseEntity<List<RecordLifecycleHistory>> history(@PathVariable String entityType,
                                                                @PathVariable String entityId) {
        return ResponseEntity.ok(workflowManager.history(entityType, entityId));
    }

    @GetMapping("/status/{entityType}/{entityId}")
    public ResponseEntity<WorkflowStatusResponse> status(@PathVariable String entityType,
                                                         @PathVariable String entityId) {
        return ResponseEntity.ok(new WorkflowStatusResponse(
                entityType, entityId, workflowManager.status(entityType, entityId)));
    }
}
