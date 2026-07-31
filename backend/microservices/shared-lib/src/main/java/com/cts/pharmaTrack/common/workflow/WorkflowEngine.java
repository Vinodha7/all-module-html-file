package com.cts.pharmaTrack.common.workflow;

import com.cts.pharmaTrack.common.exception.ForbiddenException;
import org.springframework.stereotype.Component;

/**
 * Decides a requested workflow transition (Wave 4): delegates state/role checks to
 * {@link WorkflowTransitionValidator}, then enforces the signature gate via
 * {@link SignatureGate}. Pure decision logic — no persistence.
 *
 * <p>A required-but-missing (or unverifiable) signature → {@link ForbiddenException}
 * (403). Invalid state / role rejections propagate from the validator.
 */
@Component
public class WorkflowEngine {

    private final WorkflowTransitionValidator validator;
    private final SignatureGate signatureGate;

    public WorkflowEngine(WorkflowTransitionValidator validator, SignatureGate signatureGate) {
        this.validator = validator;
        this.signatureGate = signatureGate;
    }

    /**
     * Validates the transition and, when signature-gated, resolves the authorizing
     * signature.
     *
     * @return the decision (from/to, audit action, resolved signature id — null when none required)
     */
    public TransitionDecision decide(WorkflowDefinition def, String entityId, String entityVersion,
                                     String fromStatus, String toStatus,
                                     String actorRole, String bearerToken) {

        WorkflowTransition rule = validator.validate(def, fromStatus, toStatus, actorRole);

        Integer signatureId = null;
        if (rule.requiresSignature()) {
            signatureId = signatureGate.resolveSignatureId(
                    def.getEntityType(), entityId, entityVersion, rule.getRequiredMeaning(), bearerToken);
            if (signatureId == null) {
                throw new ForbiddenException("Transition " + def.getEntityType() + " "
                        + fromStatus + " -> " + toStatus + " requires a valid "
                        + rule.getRequiredMeaning() + " electronic signature for version "
                        + entityVersion + " by an authorized signer");
            }
        }
        return new TransitionDecision(fromStatus, toStatus, rule.getAuditAction(), signatureId);
    }
}
