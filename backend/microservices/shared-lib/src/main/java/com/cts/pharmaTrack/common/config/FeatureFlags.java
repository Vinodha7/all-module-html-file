package com.cts.pharmaTrack.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Centralized feature flags for the PharmaTrack Audit &amp; Electronic Signature
 * rollout, bound from the {@code pharmatrack.features.*} configuration namespace.
 *
 * <p>Introduced in Wave 0 as pure enablement: this bean is registered and bound
 * on every servlet microservice that depends on {@code pharmatrack-common}, but
 * <strong>no code consumes these flags yet</strong>. Later waves inject this bean
 * to gate behavior. The defaults below are deliberately conservative so that,
 * absent any configuration, the platform behaves exactly as it does today.
 *
 * <ul>
 *   <li>{@code auditCentralEnabled} (default {@code false}) — when enabled, audit
 *       events are published to the central Audit Service (Wave 1+).</li>
 *   <li>{@code auditLocalFallbackEnabled} (default {@code true}) — keep the current
 *       local audit write / fall back to it if central publishing fails.</li>
 *   <li>{@code signatureV2Enabled} (default {@code false}) — enable entity-based
 *       electronic signatures on approval workflows (Wave 3+).</li>
 *   <li>{@code signatureLegacyEnabled} (default {@code false}; set {@code true}
 *       only in the IAM service) — keep the legacy {@code signAuditLog} endpoint
 *       live during migration.</li>
 * </ul>
 */
@Component
@ConfigurationProperties(prefix = "pharmatrack.features")
public class FeatureFlags {

    /** Publish audit events to the central Audit Service. */
    private boolean auditCentralEnabled = false;

    /** Retain / fall back to the existing local audit write. */
    private boolean auditLocalFallbackEnabled = true;

    /** Enable entity-based electronic signatures on approval workflows. */
    private boolean signatureV2Enabled = false;

    /** Keep the legacy admin-signature endpoint live (IAM only). */
    private boolean signatureLegacyEnabled = false;

    /** Enforce controlled approval workflows + record lifecycle history (Wave 4). */
    private boolean workflowEnabled = false;

    public boolean isAuditCentralEnabled() {
        return auditCentralEnabled;
    }

    public void setAuditCentralEnabled(boolean auditCentralEnabled) {
        this.auditCentralEnabled = auditCentralEnabled;
    }

    public boolean isAuditLocalFallbackEnabled() {
        return auditLocalFallbackEnabled;
    }

    public void setAuditLocalFallbackEnabled(boolean auditLocalFallbackEnabled) {
        this.auditLocalFallbackEnabled = auditLocalFallbackEnabled;
    }

    public boolean isSignatureV2Enabled() {
        return signatureV2Enabled;
    }

    public void setSignatureV2Enabled(boolean signatureV2Enabled) {
        this.signatureV2Enabled = signatureV2Enabled;
    }

    public boolean isSignatureLegacyEnabled() {
        return signatureLegacyEnabled;
    }

    public void setSignatureLegacyEnabled(boolean signatureLegacyEnabled) {
        this.signatureLegacyEnabled = signatureLegacyEnabled;
    }

    public boolean isWorkflowEnabled() {
        return workflowEnabled;
    }

    public void setWorkflowEnabled(boolean workflowEnabled) {
        this.workflowEnabled = workflowEnabled;
    }
}
