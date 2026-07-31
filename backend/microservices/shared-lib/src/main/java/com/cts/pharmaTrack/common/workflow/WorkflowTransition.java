package com.cts.pharmaTrack.common.workflow;

import java.util.Set;

/**
 * One explicitly-allowed transition in a {@link WorkflowDefinition} (Wave 4).
 *
 * <p>States are plain strings so each entity keeps its own existing status
 * vocabulary (e.g. {@code Draft}/{@code Approved} for TrialProtocol,
 * {@code QCHold}/{@code Released} for BatchRecord). A transition may require a
 * valid electronic signature of a specific meaning, may be restricted to a set
 * of roles, and carries an audit action verb (APPROVE, REJECT, RELEASE, SUBMIT,
 * CLOSE, …) emitted on the {@code CentralAuditEvent}.
 */
public final class WorkflowTransition {

    private final String fromStatus;
    private final String toStatus;
    private final String auditAction;            // APPROVE / REJECT / RELEASE / SUBMIT / CLOSE / ...
    private final Set<String> allowedRoles;      // empty = any authenticated role
    private final boolean requiresSignature;
    private final String requiredMeaning;        // null unless requiresSignature

    public WorkflowTransition(String fromStatus, String toStatus, String auditAction,
                              Set<String> allowedRoles, boolean requiresSignature, String requiredMeaning) {
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.auditAction = auditAction;
        this.allowedRoles = allowedRoles == null ? Set.of() : Set.copyOf(allowedRoles);
        this.requiresSignature = requiresSignature;
        this.requiredMeaning = requiredMeaning;
    }

    /** Composite lookup key {@code "<from>-><to>"}. */
    public static String key(String from, String to) {
        return from + "->" + to;
    }

    public String key() {
        return key(fromStatus, toStatus);
    }

    public String getFromStatus() {
        return fromStatus;
    }

    public String getToStatus() {
        return toStatus;
    }

    public String getAuditAction() {
        return auditAction;
    }

    public Set<String> getAllowedRoles() {
        return allowedRoles;
    }

    public boolean requiresSignature() {
        return requiresSignature;
    }

    public String getRequiredMeaning() {
        return requiredMeaning;
    }
}
