package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.SignatureMeaning;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.SignatureNotAuthorizedException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Wave 3.1 — role-based signature authorization matrix.
 */
class SignatureAuthorizationServiceTest {

    private final SignatureAuthorizationService auth = new SignatureAuthorizationService();

    // ── Authorized signatures ──────────────────────────────────────────────────

    @Test
    void investigatorMayApproveTrialProtocol() {
        assertTrue(auth.isAuthorized("Investigator", "TrialProtocol", SignatureMeaning.APPROVED));
        assertDoesNotThrow(() ->
                auth.authorize("Investigator", "TrialProtocol", SignatureMeaning.APPROVED));
    }

    @Test
    void investigatorMayReviewTrialProtocol() {
        assertDoesNotThrow(() ->
                auth.authorize("Investigator", "ClinicalTrial", SignatureMeaning.REVIEWED));
    }

    @Test
    void researcherMayReviewTrialSubject() {
        assertDoesNotThrow(() ->
                auth.authorize("Researcher", "TrialSubject", SignatureMeaning.REVIEWED));
    }

    @Test
    void qaAnalystMayReleaseBatchRecord() {
        assertDoesNotThrow(() ->
                auth.authorize("QAAnalyst", "BatchRecord", SignatureMeaning.RELEASED));
    }

    @Test
    void qaAnalystMayRejectDeviationRecord() {
        assertDoesNotThrow(() ->
                auth.authorize("QAAnalyst", "CAPARecord", SignatureMeaning.REJECTED));
    }

    @Test
    void supplyChainMayReleaseDrugShipment() {
        assertDoesNotThrow(() ->
                auth.authorize("SupplyChain", "DrugShipment", SignatureMeaning.RELEASED));
    }

    @Test
    void regulatoryOfficerMayApproveDossier() {
        assertDoesNotThrow(() ->
                auth.authorize("RegulatoryOfficer", "RegulatoryDossier", SignatureMeaning.APPROVED));
    }

    // ── Unauthorized signatures ─────────────────────────────────────────────────

    @Test
    void adminMayNotSignAnyBusinessEntity() {
        SignatureNotAuthorizedException ex = assertThrows(SignatureNotAuthorizedException.class, () ->
                auth.authorize("Admin", "TrialProtocol", SignatureMeaning.APPROVED));
        assertEquals("Role Admin cannot sign TrialProtocol with APPROVED meaning", ex.getMessage());
    }

    @Test
    void researcherMayNotApproveTrialProtocol() {
        assertFalse(auth.isAuthorized("Researcher", "TrialProtocol", SignatureMeaning.APPROVED));
        assertThrows(SignatureNotAuthorizedException.class, () ->
                auth.authorize("Researcher", "TrialProtocol", SignatureMeaning.APPROVED));
    }

    @Test
    void investigatorMayNotRejectTrialProtocol() {
        // REJECTED is not an allowed meaning for Investigator on TrialProtocol.
        assertThrows(SignatureNotAuthorizedException.class, () ->
                auth.authorize("Investigator", "TrialProtocol", SignatureMeaning.REJECTED));
    }

    @Test
    void mfgSupervisorMayNotReleaseBatchRecord() {
        // MfgSupervisor may REVIEW batch records; RELEASE belongs to QAAnalyst.
        assertThrows(SignatureNotAuthorizedException.class, () ->
                auth.authorize("MfgSupervisor", "BatchRecord", SignatureMeaning.RELEASED));
    }

    @Test
    void unknownEntityTypeIsRejected() {
        SignatureNotAuthorizedException ex = assertThrows(SignatureNotAuthorizedException.class, () ->
                auth.authorize("Investigator", "MysteryEntity", SignatureMeaning.APPROVED));
        assertEquals("Role Investigator cannot sign MysteryEntity with APPROVED meaning", ex.getMessage());
    }

    @Test
    void wrongRoleForRegulatoryEntityIsRejected() {
        assertThrows(SignatureNotAuthorizedException.class, () ->
                auth.authorize("QAAnalyst", "RegulatoryDossier", SignatureMeaning.APPROVED));
    }
}
