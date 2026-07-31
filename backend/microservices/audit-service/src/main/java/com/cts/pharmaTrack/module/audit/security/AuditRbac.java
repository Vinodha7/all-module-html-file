package com.cts.pharmaTrack.module.audit.security;

import com.cts.pharmaTrack.common.audit.AuditModules;

import java.util.Set;

/**
 * Constants for Audit Service role-based access control: the recognized role
 * names (as they appear in the JWT {@code role} claim, without the
 * {@code ROLE_} authority prefix) and the audit module names.
 *
 * <p>Pure constants — no logic, no Spring wiring. {@link ModuleScopeResolver}
 * maps roles to the modules they may read.
 *
 * <p><strong>Wave 2.1:</strong> the {@code MODULE_*} constants and
 * {@link #ALL_MODULES} are now sourced from the shared {@link AuditModules} — the
 * single source of truth also consumed by the producer-side
 * {@code AuditAspect.moduleFor()}. They are retained here as aliases for
 * backward compatibility (existing tests and callers reference
 * {@code AuditRbac.MODULE_*}); new code should prefer {@link AuditModules}.
 */
public final class AuditRbac {

    private AuditRbac() {
    }

    // ── Roles ────────────────────────────────────────────────────────────────
    public static final String ROLE_ADMIN = "Admin";
    public static final String ROLE_AUDITOR = "Auditor";
    public static final String ROLE_QA_ANALYST = "QAAnalyst";
    public static final String ROLE_QA_MANAGER = "QAManager";
    public static final String ROLE_REGULATORY_OFFICER = "RegulatoryOfficer";
    public static final String ROLE_REGULATORY_LEAD = "RegulatoryLead";
    public static final String ROLE_INVESTIGATOR = "Investigator";

    // ── Modules (aliases of the shared AuditModules canonical names) ───────────
    public static final String MODULE_CLINICAL_TRIAL = AuditModules.CLINICAL_TRIAL;
    public static final String MODULE_SUBJECT_ENROLLMENT = AuditModules.SUBJECT_ENROLLMENT;
    public static final String MODULE_BATCH_MANUFACTURING = AuditModules.BATCH_MANUFACTURING;
    public static final String MODULE_SUPPLY_CHAIN = AuditModules.SUPPLY_CHAIN;
    public static final String MODULE_REGULATORY_AFFAIRS = AuditModules.REGULATORY_AFFAIRS;
    public static final String MODULE_DEVIATION_CAPA = AuditModules.DEVIATION_CAPA;
    public static final String MODULE_IDENTITY_ACCESS_MANAGEMENT = AuditModules.IDENTITY_ACCESS_MANAGEMENT;

    /** Every known module — granted to all-access roles (Admin, Auditor). */
    public static final Set<String> ALL_MODULES = AuditModules.ALL;
}
