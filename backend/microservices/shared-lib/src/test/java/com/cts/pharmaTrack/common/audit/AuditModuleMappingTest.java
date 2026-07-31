package com.cts.pharmaTrack.common.audit;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Wave 2.1: verifies {@link AuditAspect#moduleFor(String)} emits the canonical
 * {@link AuditModules} names the Audit Service RBAC scopes on — in particular the
 * three that previously drifted (SubjectEnrollment, DeviationCAPA,
 * IdentityAccessManagement) — and that only the two documented sentinels fall
 * outside {@link AuditModules#ALL}.
 */
class AuditModuleMappingTest {

    @Test
    void canonicalSegments_mapToRbacScopedModules() {
        assertThat(AuditAspect.moduleFor("/pharmaTrack/clinicalTrial/42"))
                .isEqualTo(AuditModules.CLINICAL_TRIAL);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/trialProtocol/1"))
                .isEqualTo(AuditModules.CLINICAL_TRIAL);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/trialSite/1"))
                .isEqualTo(AuditModules.CLINICAL_TRIAL);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/subjectEnrolment/7"))
                .isEqualTo(AuditModules.SUBJECT_ENROLLMENT);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/batchManufacturing/9"))
                .isEqualTo(AuditModules.BATCH_MANUFACTURING);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/supplyColdManagement/3"))
                .isEqualTo(AuditModules.SUPPLY_CHAIN);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/deviationCapa/CAPA001"))
                .isEqualTo(AuditModules.DEVIATION_CAPA);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/regulatoryAffairs/5"))
                .isEqualTo(AuditModules.REGULATORY_AFFAIRS);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/identityAccess/login"))
                .isEqualTo(AuditModules.IDENTITY_ACCESS_MANAGEMENT);
    }

    @Test
    void everyCanonicalMapping_isInTheRbacScopeSet() {
        String[] canonicalUris = {
                "/pharmaTrack/clinicalTrial/1",
                "/pharmaTrack/subjectEnrolment/1",
                "/pharmaTrack/batchManufacturing/1",
                "/pharmaTrack/supplyColdManagement/1",
                "/pharmaTrack/deviationCapa/1",
                "/pharmaTrack/regulatoryAffairs/1",
                "/pharmaTrack/identityAccess/1"
        };
        for (String uri : canonicalUris) {
            assertThat(AuditModules.ALL).contains(AuditAspect.moduleFor(uri));
            assertThat(AuditModules.isCanonical(AuditAspect.moduleFor(uri))).isTrue();
        }
    }

    @Test
    void sentinels_areNotRbacScoped() {
        assertThat(AuditAspect.moduleFor("/pharmaTrack/notifications/1"))
                .isEqualTo(AuditModules.NOTIFICATIONS);
        assertThat(AuditAspect.moduleFor("/pharmaTrack/somethingElse/1"))
                .isEqualTo(AuditModules.UNKNOWN);
        assertThat(AuditAspect.moduleFor(null)).isEqualTo(AuditModules.UNKNOWN);

        assertThat(AuditModules.ALL).doesNotContain(AuditModules.NOTIFICATIONS, AuditModules.UNKNOWN);
        assertThat(AuditModules.isCanonical(AuditModules.NOTIFICATIONS)).isFalse();
        assertThat(AuditModules.isCanonical(AuditModules.UNKNOWN)).isFalse();
    }
}
