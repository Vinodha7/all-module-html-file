package com.cts.pharmaTrack.module.deviationCapa.workflow;

import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.workflow.WorkflowDefinition;
import com.cts.pharmaTrack.common.workflow.WorkflowEntityHandler;
import com.cts.pharmaTrack.module.deviationCapa.entity.CAPARecord;
import com.cts.pharmaTrack.module.deviationCapa.entity.DeviationRecord;
import com.cts.pharmaTrack.module.deviationCapa.repository.CAPARecordRepository;
import com.cts.pharmaTrack.module.deviationCapa.repository.DeviationRecordRepository;
import org.springframework.stereotype.Component;

/**
 * Wave 4 workflow definitions + handlers for deviationcapa-service. Statuses are
 * the existing normalized short codes ({@code OPN}, {@code INP}, {@code CLS},
 * {@code CNL}). Closing a CAPA record ({@code OPN/INP → CLS}) requires a valid
 * {@code APPROVED} signature (QAAnalyst).
 */
public final class DeviationCapaWorkflows {

    private DeviationCapaWorkflows() {
    }

    public static final WorkflowDefinition DEVIATION_RECORD = WorkflowDefinition.forEntity("DeviationRecord")
            .allow("OPN", "INP", "INVESTIGATE", "QAAnalyst", "Investigator")
            .allowSigned("INP", "CLS", "CLOSE", "APPROVED", "QAAnalyst")
            .allow("OPN", "CNL", "CANCEL", "QAAnalyst")
            .build();

    public static final WorkflowDefinition CAPA_RECORD = WorkflowDefinition.forEntity("CAPARecord")
            .allow("OPN", "INP", "START", "QAAnalyst")
            .allowSigned("INP", "CLS", "CLOSE", "APPROVED", "QAAnalyst")
            .allowSigned("OPN", "CLS", "CLOSE", "APPROVED", "QAAnalyst")
            .allow("OPN", "CNL", "CANCEL", "QAAnalyst")
            .build();

    @Component
    public static class DeviationRecordHandler implements WorkflowEntityHandler {
        private final DeviationRecordRepository repository;

        public DeviationRecordHandler(DeviationRecordRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "DeviationRecord"; }
        public WorkflowDefinition definition() { return DEVIATION_RECORD; }
        public String auditModule() { return AuditModules.DEVIATION_CAPA; }

        public String currentStatus(String entityId) {
            return repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("DeviationRecord not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            DeviationRecord record = repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("DeviationRecord not found: " + entityId));
            record.setStatus(newStatus);
            repository.save(record);
        }
    }

    @Component
    public static class CAPARecordHandler implements WorkflowEntityHandler {
        private final CAPARecordRepository repository;

        public CAPARecordHandler(CAPARecordRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "CAPARecord"; }
        public WorkflowDefinition definition() { return CAPA_RECORD; }
        public String auditModule() { return AuditModules.DEVIATION_CAPA; }

        public String currentStatus(String entityId) {
            return repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("CAPARecord not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            CAPARecord record = repository.findById(entityId)
                    .orElseThrow(() -> new ResourceNotFoundException("CAPARecord not found: " + entityId));
            record.setStatus(newStatus);
            repository.save(record);
        }
    }
}
