package com.cts.pharmaTrack.module.regulatoryAffairs.workflow;

import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.workflow.WorkflowDefinition;
import com.cts.pharmaTrack.common.workflow.WorkflowEntityHandler;
import com.cts.pharmaTrack.module.regulatoryAffairs.entity.RegulatoryDossier;
import com.cts.pharmaTrack.module.regulatoryAffairs.entity.RegulatoryMilestone;
import com.cts.pharmaTrack.module.regulatoryAffairs.repository.RegulatoryDossierRepository;
import com.cts.pharmaTrack.module.regulatoryAffairs.repository.RegulatoryMilestoneRepository;
import org.springframework.stereotype.Component;

/**
 * Wave 4 workflow definitions + handlers for regulatory-service. Statuses are the
 * entities' existing verbatim words. {@code UnderReview → Approved} requires a
 * valid {@code APPROVED} signature (RegulatoryOfficer).
 */
public final class RegulatoryWorkflows {

    private RegulatoryWorkflows() {
    }

    public static final WorkflowDefinition REGULATORY_DOSSIER = WorkflowDefinition.forEntity("RegulatoryDossier")
            .allow("InPreparation", "Submitted", "SUBMIT", "RegulatoryOfficer")
            .allow("Submitted", "UnderReview", "REVIEW", "RegulatoryOfficer")
            .allowSigned("UnderReview", "Approved", "APPROVE", "APPROVED", "RegulatoryOfficer")
            .allow("UnderReview", "Rejected", "REJECT", "RegulatoryOfficer")
            .allow("InPreparation", "Withdrawn", "WITHDRAW", "RegulatoryOfficer")
            .allow("Submitted", "Withdrawn", "WITHDRAW", "RegulatoryOfficer")
            .allow("UnderReview", "Withdrawn", "WITHDRAW", "RegulatoryOfficer")
            .build();

    public static final WorkflowDefinition REGULATORY_MILESTONE = WorkflowDefinition.forEntity("RegulatoryMilestone")
            .allow("Pending", "Completed", "COMPLETE", "RegulatoryOfficer")
            .build();

    @Component
    public static class RegulatoryDossierHandler implements WorkflowEntityHandler {
        private final RegulatoryDossierRepository repository;

        public RegulatoryDossierHandler(RegulatoryDossierRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "RegulatoryDossier"; }
        public WorkflowDefinition definition() { return REGULATORY_DOSSIER; }
        public String auditModule() { return AuditModules.REGULATORY_AFFAIRS; }

        public String currentStatus(String entityId) {
            return repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("RegulatoryDossier not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            RegulatoryDossier dossier = repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("RegulatoryDossier not found: " + entityId));
            dossier.setStatus(newStatus);
            repository.save(dossier);
        }
    }

    @Component
    public static class RegulatoryMilestoneHandler implements WorkflowEntityHandler {
        private final RegulatoryMilestoneRepository repository;

        public RegulatoryMilestoneHandler(RegulatoryMilestoneRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "RegulatoryMilestone"; }
        public WorkflowDefinition definition() { return REGULATORY_MILESTONE; }
        public String auditModule() { return AuditModules.REGULATORY_AFFAIRS; }

        public String currentStatus(String entityId) {
            return repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("RegulatoryMilestone not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            RegulatoryMilestone milestone = repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("RegulatoryMilestone not found: " + entityId));
            milestone.setStatus(newStatus);
            repository.save(milestone);
        }
    }
}
