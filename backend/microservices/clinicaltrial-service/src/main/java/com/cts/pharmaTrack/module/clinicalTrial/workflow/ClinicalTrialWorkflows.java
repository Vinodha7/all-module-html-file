package com.cts.pharmaTrack.module.clinicalTrial.workflow;

import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.workflow.WorkflowDefinition;
import com.cts.pharmaTrack.common.workflow.WorkflowEntityHandler;
import com.cts.pharmaTrack.module.clinicalTrial.entity.ClinicalTrial;
import com.cts.pharmaTrack.module.clinicalTrial.entity.TrialProtocol;
import com.cts.pharmaTrack.module.clinicalTrial.entity.TrialSite;
import com.cts.pharmaTrack.module.clinicalTrial.enums.ProtocolStatus;
import com.cts.pharmaTrack.module.clinicalTrial.enums.SiteStatus;
import com.cts.pharmaTrack.module.clinicalTrial.enums.TrialStatus;
import com.cts.pharmaTrack.module.clinicalTrial.repository.ClinicalTrialRepository;
import com.cts.pharmaTrack.module.clinicalTrial.repository.TrialProtocolRepository;
import com.cts.pharmaTrack.module.clinicalTrial.repository.TrialSiteRepository;
import org.springframework.stereotype.Component;

/**
 * Wave 4 workflow definitions + entity handlers for clinicaltrial-service. States
 * are the entities' existing enum names (persisted via {@code EnumType.STRING}).
 */
public final class ClinicalTrialWorkflows {

    private ClinicalTrialWorkflows() {
    }

    // ── Definitions (existing statuses kept verbatim) ───────────────────────────
    public static final WorkflowDefinition CLINICAL_TRIAL = WorkflowDefinition.forEntity("ClinicalTrial")
            .allow("Draft", "Active", "ACTIVATE", "Investigator")
            .allow("Active", "Suspended", "SUSPEND", "Investigator")
            .allow("Active", "Completed", "COMPLETE", "Investigator")
            .allow("Active", "Terminated", "TERMINATE", "Investigator")
            .allow("Suspended", "Active", "RESUME", "Investigator")
            .allow("Suspended", "Terminated", "TERMINATE", "Investigator")
            .build();

    public static final WorkflowDefinition TRIAL_SITE = WorkflowDefinition.forEntity("TrialSite")
            .allow("Active", "OnHold", "HOLD", "Investigator")
            .allow("Active", "Closed", "CLOSE", "Investigator")
            .allow("OnHold", "Active", "REACTIVATE", "Investigator")
            .allow("OnHold", "Closed", "CLOSE", "Investigator")
            .build();

    // TrialProtocol uses TrialProtocolWorkflow.DEFINITION (Draft→Approved signed APPROVED).

    // ── Handlers ────────────────────────────────────────────────────────────────
    @Component
    public static class ClinicalTrialHandler implements WorkflowEntityHandler {
        private final ClinicalTrialRepository repository;

        public ClinicalTrialHandler(ClinicalTrialRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "ClinicalTrial"; }
        public WorkflowDefinition definition() { return CLINICAL_TRIAL; }
        public String auditModule() { return AuditModules.CLINICAL_TRIAL; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("ClinicalTrial not found: " + entityId))
                    .getStatus().name();
        }

        public void applyStatus(String entityId, String newStatus) {
            ClinicalTrial trial = repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("ClinicalTrial not found: " + entityId));
            trial.setStatus(TrialStatus.valueOf(newStatus));
            repository.save(trial);
        }
    }

    @Component
    public static class TrialProtocolHandler implements WorkflowEntityHandler {
        private final TrialProtocolRepository repository;

        public TrialProtocolHandler(TrialProtocolRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return TrialProtocolWorkflow.ENTITY_TYPE; }
        public WorkflowDefinition definition() { return TrialProtocolWorkflow.DEFINITION; }
        public String auditModule() { return AuditModules.CLINICAL_TRIAL; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("TrialProtocol not found: " + entityId))
                    .getStatus().name();
        }

        public String currentVersion(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("TrialProtocol not found: " + entityId))
                    .getVersionNumber();
        }

        public void applyStatus(String entityId, String newStatus) {
            TrialProtocol protocol = repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("TrialProtocol not found: " + entityId));
            protocol.setStatus(ProtocolStatus.valueOf(newStatus));
            repository.save(protocol);
        }
    }

    @Component
    public static class TrialSiteHandler implements WorkflowEntityHandler {
        private final TrialSiteRepository repository;

        public TrialSiteHandler(TrialSiteRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "TrialSite"; }
        public WorkflowDefinition definition() { return TRIAL_SITE; }
        public String auditModule() { return AuditModules.CLINICAL_TRIAL; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("TrialSite not found: " + entityId))
                    .getStatus().name();
        }

        public void applyStatus(String entityId, String newStatus) {
            TrialSite site = repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("TrialSite not found: " + entityId));
            site.setStatus(SiteStatus.valueOf(newStatus));
            repository.save(site);
        }
    }
}
