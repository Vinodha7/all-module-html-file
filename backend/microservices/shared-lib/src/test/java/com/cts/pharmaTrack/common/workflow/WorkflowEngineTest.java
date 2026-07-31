package com.cts.pharmaTrack.common.workflow;

import com.cts.pharmaTrack.common.exception.ForbiddenException;
import com.cts.pharmaTrack.common.exception.InvalidStatusTransitionException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Wave 4 — workflow transition validation + signature gating.
 */
class WorkflowEngineTest {

    private static final WorkflowDefinition PROTOCOL = WorkflowDefinition.forEntity("TrialProtocol")
            .allowSigned("Draft", "Approved", "APPROVE", "APPROVED", "Investigator")
            .allow("Approved", "Superseded", "SUPERSEDE", "Investigator")
            .build();

    private static WorkflowEngine engineWithSignature(Integer id) {
        return new WorkflowEngine(new WorkflowTransitionValidator(),
                (entityType, entityId, entityVersion, requiredMeaning, bearer) -> id);
    }

    @Test
    void signedTransition_withValidSignature_returnsDecisionWithSignatureAndAction() {
        TransitionDecision d = engineWithSignature(77).decide(
                PROTOCOL, "42", "2.0", "Draft", "Approved", "Investigator", "Bearer x");
        assertEquals(77, d.getSignatureId());
        assertEquals("APPROVE", d.getAuditAction());
    }

    @Test
    void unsignedTransition_returnsNullSignature() {
        TransitionDecision d = engineWithSignature(null).decide(
                PROTOCOL, "42", "2.0", "Approved", "Superseded", "Investigator", "Bearer x");
        assertNull(d.getSignatureId());
        assertEquals("SUPERSEDE", d.getAuditAction());
    }

    @Test
    void invalidState_throwsInvalidStatusTransition() {
        InvalidStatusTransitionException ex = assertThrows(InvalidStatusTransitionException.class, () ->
                engineWithSignature(1).decide(
                        PROTOCOL, "42", "2.0", "Superseded", "Approved", "Investigator", "Bearer x"));
        assertTrue(ex.getMessage().contains("Superseded -> Approved"));
    }

    @Test
    void wrongRole_throwsForbidden() {
        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                engineWithSignature(1).decide(
                        PROTOCOL, "42", "2.0", "Draft", "Approved", "Researcher", "Bearer x"));
        assertTrue(ex.getMessage().contains("Researcher"));
    }

    @Test
    void adminCannotDriveSignedTransition() {
        assertThrows(ForbiddenException.class, () ->
                engineWithSignature(5).decide(
                        PROTOCOL, "42", "2.0", "Draft", "Approved", "Admin", "Bearer x"));
    }

    @Test
    void signedTransition_withoutSignature_throwsForbidden() {
        ForbiddenException ex = assertThrows(ForbiddenException.class, () ->
                engineWithSignature(null).decide(
                        PROTOCOL, "42", "2.0", "Draft", "Approved", "Investigator", "Bearer x"));
        assertTrue(ex.getMessage().contains("requires a valid APPROVED electronic signature"));
    }
}
