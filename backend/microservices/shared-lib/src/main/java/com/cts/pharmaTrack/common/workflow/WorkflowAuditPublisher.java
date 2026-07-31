package com.cts.pharmaTrack.common.workflow;

import com.cts.pharmaTrack.common.audit.AuditClient;
import com.cts.pharmaTrack.common.audit.CentralAuditEvent;
import com.cts.pharmaTrack.common.web.CorrelationIdFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Emits a {@link CentralAuditEvent} for every workflow transition (Wave 4,
 * requirement 6) by reusing the existing {@link AuditClient} pipeline. Action is
 * {@code TRANSITION}; old/new status and the authorizing signature id are carried
 * in the before/after images. Never blocks the transition.
 */
@Component
public class WorkflowAuditPublisher {

    private static final Logger log = LoggerFactory.getLogger(WorkflowAuditPublisher.class);
    private static final String DEFAULT_ACTION = "TRANSITION";

    private final AuditClient auditClient;

    public WorkflowAuditPublisher(AuditClient auditClient) {
        this.auditClient = auditClient;
    }

    public void publishTransition(String module, String entityType, String entityId, String action,
                                  String oldStatus, String newStatus, Integer signatureId, String reason,
                                  String performedBy, String performedByName, LocalDateTime performedAt,
                                  String ipAddress, String bearerToken) {

        CentralAuditEvent event = new CentralAuditEvent();
        event.setEventId(UUID.randomUUID().toString());
        event.setModule(module);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setAction(action != null ? action : DEFAULT_ACTION);
        event.setPerformedBy(performedBy);
        event.setPerformedByName(performedByName);
        event.setPerformedAt(performedAt);

        Map<String, Object> oldValues = new LinkedHashMap<>();
        oldValues.put("status", oldStatus);
        event.setOldValues(oldValues);

        Map<String, Object> newValues = new LinkedHashMap<>();
        newValues.put("status", newStatus);
        newValues.put("signatureId", signatureId);
        newValues.put("reason", reason);
        event.setNewValues(newValues);

        event.setIpAddress(ipAddress);
        event.setCorrelationId(MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY));

        if (!auditClient.publish(event, bearerToken)) {
            log.warn("Central audit publish for transition {} {}:{} {}->{} ({}) returned false",
                    module, entityType, entityId, oldStatus, newStatus, action);
        }
    }
}
