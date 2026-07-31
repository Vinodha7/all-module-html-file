package com.cts.pharmaTrack.common.workflow;

import com.cts.pharmaTrack.common.exception.ForbiddenException;
import com.cts.pharmaTrack.common.exception.InvalidStatusTransitionException;
import org.springframework.stereotype.Component;

/**
 * Validates the state-machine and role aspects of a workflow transition (Wave 4).
 * Pure decision logic (no persistence, no signature I/O), so it is trivially
 * unit-testable.
 *
 * <ul>
 *   <li>Transition not declared in the definition → {@link InvalidStatusTransitionException} (409).</li>
 *   <li>Actor role not permitted for the transition → {@link ForbiddenException} (403).
 *       (Roles come from the existing project set; {@code Admin} is simply never
 *       listed on a business-approval transition.)</li>
 * </ul>
 */
@Component
public class WorkflowTransitionValidator {

    /**
     * @return the matching transition rule
     * @throws InvalidStatusTransitionException when (from → to) is not allowed
     * @throws ForbiddenException when the actor's role may not perform it
     */
    public WorkflowTransition validate(WorkflowDefinition def, String fromStatus,
                                       String toStatus, String actorRole) {
        WorkflowTransition rule = def.transition(fromStatus, toStatus)
                .orElseThrow(() -> new InvalidStatusTransitionException(
                        "Invalid workflow transition for " + def.getEntityType()
                                + ": " + fromStatus + " -> " + toStatus + " is not allowed"));

        if (!rule.getAllowedRoles().isEmpty()
                && (actorRole == null || !rule.getAllowedRoles().contains(actorRole))) {
            throw new ForbiddenException("Role " + actorRole + " is not permitted to transition "
                    + def.getEntityType() + " from " + fromStatus + " to " + toStatus);
        }
        return rule;
    }
}
