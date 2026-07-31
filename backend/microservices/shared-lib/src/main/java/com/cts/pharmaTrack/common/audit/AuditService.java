package com.cts.pharmaTrack.common.audit;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * Persists audit records. Failures here must never break the business
 * operation, so callers should treat auditing as best-effort.
 */
@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public void record(String userId, String action, String entityType,
                       String recordId, String reason, String endpoint,
                       String module, String newValue) {
        AuditLog log = new AuditLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setRecordId(recordId);
        log.setReason(reason);
        log.setEndpoint(endpoint);
        log.setModule(module);
        log.setNewValue(newValue);
        log.setTimestamp(LocalDateTime.now());
        repository.save(log); // checksum computed via @PrePersist
    }
}
