package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.SignatureMeaning;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.SignatureNotAuthorizedException;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import static com.cts.pharmaTrack.module.identityAccessManagement.entity.SignatureMeaning.*;

/**
 * Wave 3.1 — role-based authorization for entity-based electronic signatures.
 *
 * <p>Enforces which existing PharmaTrack role may apply which
 * {@link SignatureMeaning} to which {@code entityType}, per the fixed
 * authorization matrix below. No new roles are introduced. {@code Admin} is
 * deliberately absent from every entry: an administrator may manage the platform
 * but may not apply business signatures.
 *
 * <p>This is authorization only — it runs <em>before</em> signing and changes
 * nothing about hashing, verification, audit SIGN events, legacy signatures, or
 * the {@code signature-v2-enabled} feature gate.
 */
@Service
public class SignatureAuthorizationService {

    // ── Existing PharmaTrack roles (JWT "role" claim values) ────────────────────
    static final String RESEARCHER = "Researcher";
    static final String INVESTIGATOR = "Investigator";
    static final String QA_ANALYST = "QAAnalyst";
    static final String MFG_SUPERVISOR = "MfgSupervisor";
    static final String SUPPLY_CHAIN = "SupplyChain";
    static final String REGULATORY_OFFICER = "RegulatoryOfficer";

    /** entityType → (role → meanings that role may sign it with). */
    private static final Map<String, Map<String, Set<SignatureMeaning>>> MATRIX = buildMatrix();

    /**
     * Authorizes a signing attempt; throws {@link SignatureNotAuthorizedException}
     * (→ HTTP 403) when the role/entityType/meaning combination is not permitted.
     */
    public void authorize(String role, String entityType, SignatureMeaning meaning) {
        if (!isAuthorized(role, entityType, meaning)) {
            throw new SignatureNotAuthorizedException(
                    "Role " + role + " cannot sign " + entityType + " with " + meaning + " meaning");
        }
    }

    /** True when {@code role} may apply {@code meaning} to {@code entityType}. */
    public boolean isAuthorized(String role, String entityType, SignatureMeaning meaning) {
        Map<String, Set<SignatureMeaning>> byRole = MATRIX.get(entityType);
        if (byRole == null) {
            return false; // unknown / unmapped entity type — no role may sign it
        }
        Set<SignatureMeaning> allowed = byRole.get(role);
        return allowed != null && allowed.contains(meaning);
    }

    private static Map<String, Map<String, Set<SignatureMeaning>>> buildMatrix() {
        Map<String, Map<String, Set<SignatureMeaning>>> m = new LinkedHashMap<>();

        // Clinical Trial & Protocol Management
        addGroup(m, Map.of(INVESTIGATOR, EnumSet.of(REVIEWED, APPROVED)),
                "TrialProtocol", "ClinicalTrial", "TrialSite");

        // Subject Enrolment & Visit Management
        addGroup(m, Map.of(RESEARCHER, EnumSet.of(REVIEWED),
                        INVESTIGATOR, EnumSet.of(REVIEWED)),
                "TrialSubject", "VisitRecord", "AdverseEvent");

        // Deviation & CAPA Management
        addGroup(m, Map.of(QA_ANALYST, EnumSet.of(APPROVED, REJECTED)),
                "DeviationRecord", "CAPARecord");

        // Batch Manufacturing & Quality Control
        addGroup(m, Map.of(MFG_SUPERVISOR, EnumSet.of(REVIEWED),
                        QA_ANALYST, EnumSet.of(RELEASED)),
                "BatchRecord", "QCTest", "RawMaterialUsage");

        // Supply Chain & Cold Chain Management
        addGroup(m, Map.of(SUPPLY_CHAIN, EnumSet.of(APPROVED, RELEASED)),
                "DrugShipment", "ColdChainLog", "SiteInventory");

        // Regulatory Affairs & Submission Tracking
        addGroup(m, Map.of(REGULATORY_OFFICER, EnumSet.of(APPROVED, REJECTED)),
                "RegulatoryDossier", "RegulatoryMilestone");

        return m;
    }

    private static void addGroup(Map<String, Map<String, Set<SignatureMeaning>>> m,
                                 Map<String, Set<SignatureMeaning>> rolePermissions,
                                 String... entityTypes) {
        for (String entityType : entityTypes) {
            m.put(entityType, rolePermissions);
        }
    }
}
