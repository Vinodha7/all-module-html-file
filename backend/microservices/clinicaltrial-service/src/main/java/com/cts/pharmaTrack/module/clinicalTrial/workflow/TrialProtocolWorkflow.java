package com.cts.pharmaTrack.module.clinicalTrial.workflow;

import com.cts.pharmaTrack.common.workflow.WorkflowDefinition;

/**
 * Wave 4 approval workflow for {@code TrialProtocol} (reference slice).
 *
 * <p>Keeps the entity's existing states ({@code Draft}/{@code Approved}/
 * {@code Superseded}) and layers explicit transition control on top:
 * <ul>
 *   <li>{@code Draft → Approved} — requires a valid {@code APPROVED} electronic
 *       signature (verified in IAM) and the {@code Investigator} role.</li>
 *   <li>{@code Approved → Superseded} — {@code Investigator}, no signature.</li>
 * </ul>
 * Any other transition (e.g. {@code Superseded → *}) is not defined and is
 * therefore rejected as an invalid workflow state.
 */
public final class TrialProtocolWorkflow {

    public static final String ENTITY_TYPE = "TrialProtocol";

    public static final WorkflowDefinition DEFINITION = WorkflowDefinition.forEntity(ENTITY_TYPE)
            .allowSigned("Draft", "Approved", "APPROVE", "APPROVED", "Investigator")
            .allow("Approved", "Superseded", "SUPERSEDE", "Investigator")
            .build();

    private TrialProtocolWorkflow() {
    }
}
