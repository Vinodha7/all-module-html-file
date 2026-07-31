package com.cts.pharmaTrack.common.audit;

import java.util.Set;

/**
 * Single source of truth for PharmaTrack audit <em>module</em> names — the
 * canonical string written to every audit record's {@code module} field and used
 * by the Audit Service to scope reads per role.
 *
 * <p>Introduced in Wave 2.1 to remove the drift between the names emitted by
 * {@link AuditAspect#moduleFor(String)} (producer side) and the names the Audit
 * Service's RBAC recognized (consumer side). Both sides now consume these
 * constants, so a producer can never emit a module the RBAC scope will not
 * match.
 *
 * <p><strong>Canonical vs. sentinel.</strong> {@link #ALL} lists the seven
 * canonical, RBAC-scoped modules. {@link #NOTIFICATIONS} and {@link #UNKNOWN} are
 * <em>sentinels</em>: the aspect may still emit them (for the notifications
 * endpoint and for unmapped URIs respectively), but they are deliberately
 * <strong>not</strong> in {@link #ALL} — no role scopes them, so any centrally
 * stored event bearing a sentinel module is invisible to every reader (including
 * Admin/Auditor, because the read query filters {@code module IN <allowed>}).
 * A service must therefore not have central publishing enabled until all of its
 * audited endpoints map to a canonical module (see the Wave 2.1 readiness
 * checklist).
 */
public final class AuditModules {

    private AuditModules() {
    }

    // ── Canonical, RBAC-scoped modules ─────────────────────────────────────────
    public static final String CLINICAL_TRIAL = "ClinicalTrial";
    public static final String SUBJECT_ENROLLMENT = "SubjectEnrollment";
    public static final String BATCH_MANUFACTURING = "BatchManufacturing";
    public static final String SUPPLY_CHAIN = "SupplyChain";
    public static final String REGULATORY_AFFAIRS = "RegulatoryAffairs";
    public static final String DEVIATION_CAPA = "DeviationCAPA";
    public static final String IDENTITY_ACCESS_MANAGEMENT = "IdentityAccessManagement";

    /** Every canonical module — the complete set an all-access role (Admin/Auditor) may read. */
    public static final Set<String> ALL = Set.of(
            CLINICAL_TRIAL,
            SUBJECT_ENROLLMENT,
            BATCH_MANUFACTURING,
            SUPPLY_CHAIN,
            REGULATORY_AFFAIRS,
            DEVIATION_CAPA,
            IDENTITY_ACCESS_MANAGEMENT);

    // ── Non-canonical sentinels (NOT in ALL; not RBAC-scoped) ──────────────────
    /** Notifications endpoint: audited locally but not yet a scoped central module. */
    public static final String NOTIFICATIONS = "Notifications";

    /** Fallback for a request URI that maps to no known module. */
    public static final String UNKNOWN = "Unknown";

    /** True when {@code module} is one of the seven canonical, RBAC-scoped modules. */
    public static boolean isCanonical(String module) {
        return ALL.contains(module);
    }
}
