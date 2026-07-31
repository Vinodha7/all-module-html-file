package com.cts.pharmaTrack.common.workflow;

import com.cts.pharmaTrack.common.security.SignedPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Wave 4 orchestrator over {@link WorkflowEngine}. A caller (an owning service's
 * status method, or the generic {@code WorkflowManager}) invokes
 * {@link #validateTransition} <em>before</em> it changes a record's status, then
 * {@link #recordTransition} <em>after</em> the change is persisted, so history and
 * the {@code CentralAuditEvent} reflect a committed transition.
 *
 * <p>Actor identity (from the {@link SignedPrincipal}) and the Bearer token / IP
 * (from the current request) are derived here, so callers pass only business facts.
 */
@Component
public class WorkflowService {

    private final WorkflowEngine engine;
    private final RecordLifecycleHistoryRepository historyRepository;
    private final WorkflowAuditPublisher auditPublisher;

    public WorkflowService(WorkflowEngine engine,
                           RecordLifecycleHistoryRepository historyRepository,
                           WorkflowAuditPublisher auditPublisher) {
        this.engine = engine;
        this.historyRepository = historyRepository;
        this.auditPublisher = auditPublisher;
    }

    /**
     * Validates the requested transition for the current actor and resolves the
     * authorizing signature. Throws (409/403) on any invalid transition.
     */
    public TransitionDecision validateTransition(WorkflowDefinition def, String entityId,
                                                 String entityVersion, String fromStatus, String toStatus) {
        return engine.decide(def, entityId, entityVersion, fromStatus, toStatus, actorRole(), bearerToken());
    }

    /** Persists lifecycle history and emits the transition's CentralAuditEvent. */
    public RecordLifecycleHistory recordTransition(String module, String entityType, String entityId,
                                                   TransitionDecision decision, String reason) {
        SignedPrincipal actor = actor();
        String changedBy = changedBy(actor);
        LocalDateTime now = LocalDateTime.now();

        RecordLifecycleHistory history = new RecordLifecycleHistory();
        history.setEntityType(entityType);
        history.setEntityId(entityId);
        history.setOldStatus(decision.getFromStatus());
        history.setNewStatus(decision.getToStatus());
        history.setChangedBy(changedBy);
        history.setChangedAt(now);
        history.setSignatureId(decision.getSignatureId());
        history.setReason(reason);
        RecordLifecycleHistory saved = historyRepository.save(history);

        auditPublisher.publishTransition(module, entityType, entityId, decision.getAuditAction(),
                decision.getFromStatus(), decision.getToStatus(), decision.getSignatureId(), reason,
                changedBy, actor != null ? actor.getDisplayName() : null, now, ipAddress(), bearerToken());
        return saved;
    }

    /** Full lifecycle history of one record, oldest first. */
    public List<RecordLifecycleHistory> history(String entityType, String entityId) {
        return historyRepository.findByEntityTypeAndEntityIdOrderByChangedAtAsc(entityType, entityId);
    }

    // ── request/security context helpers ───────────────────────────────────────

    private static SignedPrincipal actor() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof SignedPrincipal p) {
            return p;
        }
        return null;
    }

    private static String actorRole() {
        SignedPrincipal p = actor();
        return p != null ? p.getRole() : null;
    }

    private static String changedBy(SignedPrincipal actor) {
        if (actor == null) {
            return null;
        }
        return actor.getUserId() != null ? String.valueOf(actor.getUserId()) : actor.getEmail();
    }

    private static HttpServletRequest currentRequest() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            return attrs.getRequest();
        }
        return null;
    }

    private static String bearerToken() {
        HttpServletRequest req = currentRequest();
        return req != null ? req.getHeader(HttpHeaders.AUTHORIZATION) : null;
    }

    private static String ipAddress() {
        HttpServletRequest req = currentRequest();
        return req != null ? req.getRemoteAddr() : null;
    }
}
