package com.cts.pharmaTrack.module.batchManufacturing.workflow;

import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.workflow.WorkflowDefinition;
import com.cts.pharmaTrack.common.workflow.WorkflowEntityHandler;
import com.cts.pharmaTrack.module.batchManufacturing.entity.BatchRecord;
import com.cts.pharmaTrack.module.batchManufacturing.entity.QCTest;
import com.cts.pharmaTrack.module.batchManufacturing.entity.RawMaterialUsage;
import com.cts.pharmaTrack.module.batchManufacturing.repository.BatchRecordRepository;
import com.cts.pharmaTrack.module.batchManufacturing.repository.QCTestRepository;
import com.cts.pharmaTrack.module.batchManufacturing.repository.RawMaterialRepository;
import org.springframework.stereotype.Component;

/**
 * Wave 4 workflow definitions + handlers for batch-service. Statuses are the
 * existing 3-letter short codes stored by these entities
 * (BatchRecord IP/QCH/REL/REJ/RCL/DEL, QCTest RT/P/F/DEL, RawMaterialUsage CON/QRN/DEL).
 * {@code QCH → REL} requires a valid {@code RELEASED} signature (QAAnalyst).
 */
public final class BatchWorkflows {

    private BatchWorkflows() {
    }

    public static final WorkflowDefinition BATCH_RECORD = WorkflowDefinition.forEntity("BatchRecord")
            .allow("IP", "QCH", "SUBMIT", "MfgSupervisor")
            .allowSigned("QCH", "REL", "RELEASE", "RELEASED", "QAAnalyst")
            .allow("QCH", "REJ", "REJECT", "QAAnalyst")
            .allow("REL", "RCL", "RECALL", "QAAnalyst")
            .allow("REJ", "DEL", "DELETE", "MfgSupervisor")
            .allow("RCL", "DEL", "DELETE", "MfgSupervisor")
            .build();

    public static final WorkflowDefinition QC_TEST = WorkflowDefinition.forEntity("QCTest")
            .allow("RT", "P", "PASS", "QAAnalyst")
            .allow("RT", "F", "FAIL", "QAAnalyst")
            .allow("F", "RT", "RETEST", "QAAnalyst")
            .allow("F", "DEL", "DELETE", "QAAnalyst")
            .allow("P", "DEL", "DELETE", "QAAnalyst")
            .build();

    public static final WorkflowDefinition RAW_MATERIAL_USAGE = WorkflowDefinition.forEntity("RawMaterialUsage")
            .allow("CON", "QRN", "QUARANTINE", "MfgSupervisor")
            .allow("QRN", "CON", "RELEASE", "MfgSupervisor")
            .allow("CON", "DEL", "DELETE", "MfgSupervisor")
            .allow("QRN", "DEL", "DELETE", "MfgSupervisor")
            .build();

    @Component
    public static class BatchRecordHandler implements WorkflowEntityHandler {
        private final BatchRecordRepository repository;

        public BatchRecordHandler(BatchRecordRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "BatchRecord"; }
        public WorkflowDefinition definition() { return BATCH_RECORD; }
        public String auditModule() { return AuditModules.BATCH_MANUFACTURING; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("BatchRecord not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            BatchRecord batch = repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("BatchRecord not found: " + entityId));
            batch.setStatus(newStatus);
            repository.save(batch);
        }
    }

    @Component
    public static class QCTestHandler implements WorkflowEntityHandler {
        private final QCTestRepository repository;

        public QCTestHandler(QCTestRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "QCTest"; }
        public WorkflowDefinition definition() { return QC_TEST; }
        public String auditModule() { return AuditModules.BATCH_MANUFACTURING; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("QCTest not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            QCTest test = repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("QCTest not found: " + entityId));
            test.setStatus(newStatus);
            repository.save(test);
        }
    }

    @Component
    public static class RawMaterialUsageHandler implements WorkflowEntityHandler {
        private final RawMaterialRepository repository;

        public RawMaterialUsageHandler(RawMaterialRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "RawMaterialUsage"; }
        public WorkflowDefinition definition() { return RAW_MATERIAL_USAGE; }
        public String auditModule() { return AuditModules.BATCH_MANUFACTURING; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("RawMaterialUsage not found: " + entityId))
                    .getStatus();
        }

        public void applyStatus(String entityId, String newStatus) {
            RawMaterialUsage usage = repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("RawMaterialUsage not found: " + entityId));
            usage.setStatus(newStatus);
            repository.save(usage);
        }
    }
}
