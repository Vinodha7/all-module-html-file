package com.cts.pharmaTrack.module.audit.security;

import com.cts.pharmaTrack.common.audit.AuditModules;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * Resolves the set of audit modules a given role is permitted to read.
 *
 * <p>Input is the plain role name from the JWT {@code role} claim (not the
 * {@code ROLE_} authority). All-access roles (Admin, Auditor) receive every
 * module; scoped roles receive their subset; any unknown or null role receives
 * an empty set (deny by default). Returned sets are immutable.
 */
@Component
public class ModuleScopeResolver {

    /** Modules the role may read; empty for unknown/null roles. */
    public Set<String> resolveModules(String role) {
        if (role == null) {
            return Set.of();
        }
        return switch (role) {
            case AuditRbac.ROLE_ADMIN, AuditRbac.ROLE_AUDITOR ->
                    AuditModules.ALL;
            case AuditRbac.ROLE_QA_ANALYST, AuditRbac.ROLE_QA_MANAGER ->
                    Set.of(AuditModules.BATCH_MANUFACTURING,
                            AuditModules.DEVIATION_CAPA);
            case AuditRbac.ROLE_REGULATORY_OFFICER, AuditRbac.ROLE_REGULATORY_LEAD ->
                    Set.of(AuditModules.REGULATORY_AFFAIRS);
            case AuditRbac.ROLE_INVESTIGATOR ->
                    Set.of(AuditModules.CLINICAL_TRIAL,
                            AuditModules.SUBJECT_ENROLLMENT);
            default -> Set.of();
        };
    }
}
