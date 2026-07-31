package com.cts.pharmaTrack.common.workflow;

/**
 * SPI implemented once per workflow-managed entity (Wave 4). Each owning service
 * registers a Spring bean per entity; the generic {@code WorkflowManager}
 * discovers them and routes {@code /workflow/*} calls by {@link #entityType()}.
 *
 * <p>This is how workflow state stays <strong>inside each business
 * service/entity</strong> (per the architecture decision) while the API stays
 * generic: the handler reads/writes the entity's own status field via its own
 * repository; the framework owns transition rules, signature gating, history and
 * audit.
 */
public interface WorkflowEntityHandler {

    /** Canonical entity type, e.g. {@code "TrialProtocol"}. Matches the URL/request value. */
    String entityType();

    /** The transition rules for this entity. */
    WorkflowDefinition definition();

    /** Canonical audit module name (see {@code AuditModules}) for emitted events. */
    String auditModule();

    /** Current status of the record (its existing status value), or throws if not found. */
    String currentStatus(String entityId);

    /** Version linkage for signature verification; {@code null} for unversioned entities. */
    default String currentVersion(String entityId) {
        return null;
    }

    /** Applies and persists the new status on the record. */
    void applyStatus(String entityId, String newStatus);
}
