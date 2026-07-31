package com.cts.pharmaTrack.common.workflow;

/**
 * Outcome of a validated workflow transition (Wave 4): the from/to states, the
 * audit action verb to emit, and the resolved authorizing signature id (null when
 * the transition needs no signature).
 */
public final class TransitionDecision {

    private final String fromStatus;
    private final String toStatus;
    private final String auditAction;
    private final Integer signatureId;

    public TransitionDecision(String fromStatus, String toStatus, String auditAction, Integer signatureId) {
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.auditAction = auditAction;
        this.signatureId = signatureId;
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

    public Integer getSignatureId() {
        return signatureId;
    }
}
