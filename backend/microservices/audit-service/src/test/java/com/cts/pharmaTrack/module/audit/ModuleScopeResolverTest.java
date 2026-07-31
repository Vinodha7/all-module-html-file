package com.cts.pharmaTrack.module.audit;

import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.module.audit.security.AuditRbac;
import com.cts.pharmaTrack.module.audit.security.ModuleScopeResolver;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Wave 2.1: the scope resolver must key on the same canonical module names the
 * producer now emits. These cases lock in the three names that previously drifted
 * so a regression (e.g. reverting to "Deviation"/"SubjectEnrolment"/"IAM") is
 * caught here rather than as silent missing-visibility in production.
 */
class ModuleScopeResolverTest {

    private final ModuleScopeResolver resolver = new ModuleScopeResolver();

    @Test
    void adminAndAuditor_seeAllCanonicalModules() {
        assertThat(resolver.resolveModules(AuditRbac.ROLE_ADMIN)).isEqualTo(AuditModules.ALL);
        assertThat(resolver.resolveModules(AuditRbac.ROLE_AUDITOR)).isEqualTo(AuditModules.ALL);
        // Backward-compat alias points at the same set.
        assertThat(AuditRbac.ALL_MODULES).isEqualTo(AuditModules.ALL);
    }

    @Test
    void qaRoles_scopeIncludesCanonicalDeviationCapa() {
        assertThat(resolver.resolveModules(AuditRbac.ROLE_QA_MANAGER))
                .containsExactlyInAnyOrder(AuditModules.BATCH_MANUFACTURING, AuditModules.DEVIATION_CAPA);
        assertThat(resolver.resolveModules(AuditRbac.ROLE_QA_ANALYST))
                .contains(AuditModules.DEVIATION_CAPA)
                .doesNotContain("Deviation");
    }

    @Test
    void investigator_scopeIncludesCanonicalSubjectEnrollment() {
        assertThat(resolver.resolveModules(AuditRbac.ROLE_INVESTIGATOR))
                .containsExactlyInAnyOrder(AuditModules.CLINICAL_TRIAL, AuditModules.SUBJECT_ENROLLMENT)
                .doesNotContain("SubjectEnrolment");
    }

    @Test
    void unknownAndNullRoles_seeNothing() {
        assertThat(resolver.resolveModules("Nobody")).isEqualTo(Set.of());
        assertThat(resolver.resolveModules(null)).isEqualTo(Set.of());
    }

    @Test
    void everyResolvedModule_isCanonical() {
        for (String role : new String[]{AuditRbac.ROLE_ADMIN, AuditRbac.ROLE_QA_MANAGER,
                AuditRbac.ROLE_REGULATORY_OFFICER, AuditRbac.ROLE_INVESTIGATOR}) {
            for (String module : resolver.resolveModules(role)) {
                assertThat(AuditModules.isCanonical(module))
                        .as("role %s resolves canonical module %s", role, module).isTrue();
            }
        }
    }
}
