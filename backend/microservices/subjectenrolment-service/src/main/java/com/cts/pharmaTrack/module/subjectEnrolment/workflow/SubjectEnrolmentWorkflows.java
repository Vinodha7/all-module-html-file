package com.cts.pharmaTrack.module.subjectEnrolment.workflow;

import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.workflow.WorkflowDefinition;
import com.cts.pharmaTrack.common.workflow.WorkflowEntityHandler;
import com.cts.pharmaTrack.module.subjectEnrolment.entity.AdverseEvent;
import com.cts.pharmaTrack.module.subjectEnrolment.entity.TrialSubject;
import com.cts.pharmaTrack.module.subjectEnrolment.entity.VisitRecord;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.AdverseEventRepository;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.TrialSubjectRepository;
import com.cts.pharmaTrack.module.subjectEnrolment.repository.VisitRecordRepository;
import org.springframework.stereotype.Component;

/**
 * Wave 4 workflow definitions + handlers for subjectenrolment-service. Status is a
 * free-form String on these entities; the initial values ({@code Enrolled},
 * {@code Scheduled}, {@code Open}) are kept, and review/close states are layered on
 * top. Review transitions require a {@code REVIEWED} signature, matching the Wave
 * 3.1 signature matrix (Researcher/Investigator → REVIEWED for these entities).
 */
public final class SubjectEnrolmentWorkflows {

    private SubjectEnrolmentWorkflows() {
    }

    public static final WorkflowDefinition TRIAL_SUBJECT = WorkflowDefinition.forEntity("TrialSubject")
            .allowSigned("Enrolled", "Reviewed", "REVIEW", "REVIEWED", "Researcher", "Investigator")
            .allow("Reviewed", "Completed", "COMPLETE", "Investigator")
            .allow("Enrolled", "Withdrawn", "WITHDRAW", "Investigator")
            .build();

    public static final WorkflowDefinition VISIT_RECORD = WorkflowDefinition.forEntity("VisitRecord")
            .allow("Scheduled", "Completed", "COMPLETE", "Researcher", "Investigator")
            .allowSigned("Completed", "Reviewed", "REVIEW", "REVIEWED", "Investigator")
            .build();

    public static final WorkflowDefinition ADVERSE_EVENT = WorkflowDefinition.forEntity("AdverseEvent")
            .allowSigned("Open", "Reviewed", "REVIEW", "REVIEWED", "Investigator")
            .allow("Reviewed", "Closed", "CLOSE", "Investigator")
            .build();

    @Component
    public static class TrialSubjectHandler implements WorkflowEntityHandler {
        private final TrialSubjectRepository repository;

        public TrialSubjectHandler(TrialSubjectRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "TrialSubject"; }
        public WorkflowDefinition definition() { return TRIAL_SUBJECT; }
        public String auditModule() { return AuditModules.SUBJECT_ENROLLMENT; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.valueOf(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("TrialSubject not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            TrialSubject subject = repository.findById(Integer.valueOf(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("TrialSubject not found: " + entityId));
            subject.setStatus(newStatus);
            repository.save(subject);
        }
    }

    @Component
    public static class VisitRecordHandler implements WorkflowEntityHandler {
        private final VisitRecordRepository repository;

        public VisitRecordHandler(VisitRecordRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "VisitRecord"; }
        public WorkflowDefinition definition() { return VISIT_RECORD; }
        public String auditModule() { return AuditModules.SUBJECT_ENROLLMENT; }

        public String currentStatus(String entityId) {
            return repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("VisitRecord not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            VisitRecord visit = repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("VisitRecord not found: " + entityId));
            visit.setStatus(newStatus);
            repository.save(visit);
        }
    }

    @Component
    public static class AdverseEventHandler implements WorkflowEntityHandler {
        private final AdverseEventRepository repository;

        public AdverseEventHandler(AdverseEventRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "AdverseEvent"; }
        public WorkflowDefinition definition() { return ADVERSE_EVENT; }
        public String auditModule() { return AuditModules.SUBJECT_ENROLLMENT; }

        public String currentStatus(String entityId) {
            return repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("AdverseEvent not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            AdverseEvent event = repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("AdverseEvent not found: " + entityId));
            event.setStatus(newStatus);
            repository.save(event);
        }
    }
}
