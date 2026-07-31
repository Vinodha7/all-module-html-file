package com.cts.pharmaTrack.common.workflow;

import com.cts.pharmaTrack.common.config.FeatureFlags;
import com.cts.pharmaTrack.common.exception.BadRequestException;
import com.cts.pharmaTrack.common.exception.ForbiddenException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Generic Wave 4 workflow orchestration over the {@link WorkflowEntityHandler}
 * beans registered in the current service. Backs the generic {@code /workflow}
 * API: resolve handler → read current status → validate (state/role/signature) →
 * apply new status → record history + emit audit — all in one transaction so a
 * failed validation leaves no partial change.
 */
@Component
public class WorkflowManager {

    private final Map<String, WorkflowEntityHandler> handlers = new LinkedHashMap<>();
    private final WorkflowService workflowService;
    private final FeatureFlags featureFlags;

    public WorkflowManager(List<WorkflowEntityHandler> entityHandlers, WorkflowService workflowService,
                           FeatureFlags featureFlags) {
        for (WorkflowEntityHandler handler : entityHandlers) {
            handlers.put(handler.entityType(), handler);
        }
        this.workflowService = workflowService;
        this.featureFlags = featureFlags;
    }

    @Transactional
    public RecordLifecycleHistory transition(String entityType, String entityId,
                                             String targetStatus, String reason) {
        if (!featureFlags.isWorkflowEnabled()) {
            throw new ForbiddenException(
                    "Workflow transitions are disabled (pharmatrack.features.workflow-enabled=false)");
        }
        WorkflowEntityHandler handler = handler(entityType);
        String fromStatus = handler.currentStatus(entityId);
        String version = handler.currentVersion(entityId);

        TransitionDecision decision = workflowService.validateTransition(
                handler.definition(), entityId, version, fromStatus, targetStatus);

        handler.applyStatus(entityId, targetStatus);

        return workflowService.recordTransition(
                handler.auditModule(), entityType, entityId, decision, reason);
    }

    public List<RecordLifecycleHistory> history(String entityType, String entityId) {
        handler(entityType); // 400 if this service doesn't manage the type
        return workflowService.history(entityType, entityId);
    }

    public String status(String entityType, String entityId) {
        return handler(entityType).currentStatus(entityId);
    }

    /** Whether this service manages the given entity type. */
    public boolean supports(String entityType) {
        return handlers.containsKey(entityType);
    }

    private WorkflowEntityHandler handler(String entityType) {
        WorkflowEntityHandler handler = handlers.get(entityType);
        if (handler == null) {
            throw new BadRequestException("No workflow configured for entityType '" + entityType
                    + "' in this service. Managed types: " + handlers.keySet());
        }
        return handler;
    }
}
