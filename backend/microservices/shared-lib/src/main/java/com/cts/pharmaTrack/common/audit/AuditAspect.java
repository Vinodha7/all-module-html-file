package com.cts.pharmaTrack.common.audit;

import com.cts.pharmaTrack.common.config.FeatureFlags;
import com.cts.pharmaTrack.common.security.SignedPrincipal;
import com.cts.pharmaTrack.common.web.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Automatically records an audit entry for every successful mutating request
 * (POST/PUT/PATCH/DELETE) handled by any {@code *Controller} in a service. Read
 * operations are not audited. The reason-for-change is read from the optional
 * {@code X-Audit-Reason} request header (21 CFR Part 11). Auditing never breaks
 * the business call — any failure is logged and swallowed.
 *
 * <p><strong>Wave 2 — central publishing with local fallback.</strong> Where the
 * entry is written is governed by two feature flags ({@link FeatureFlags}):
 * <ul>
 *   <li>{@code audit-central-enabled=false} (default): write to the local
 *       {@code audit_log} table iff {@code audit-local-fallback-enabled} is on —
 *       i.e. exactly today's behavior with the conservative defaults.</li>
 *   <li>{@code audit-central-enabled=true}: publish to the central Audit Service;
 *       if that fails and {@code audit-local-fallback-enabled} is on, fall back to
 *       the local write. On a successful publish the local write is skipped to
 *       avoid double-recording.</li>
 * </ul>
 * When both flags are off the aspect records nothing — this is how the Audit
 * Service itself is configured so the shared aspect does not self-audit (R1).
 */
@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);

    private static final Map<String, String> ACTIONS = Map.of(
            "POST", "CREATE",
            "PUT", "UPDATE",
            "PATCH", "UPDATE",
            "DELETE", "DELETE");

    private final AuditService auditService;
    private final AuditClient auditClient;
    private final FeatureFlags featureFlags;

    public AuditAspect(AuditService auditService,
                       AuditClient auditClient,
                       FeatureFlags featureFlags) {
        this.auditService = auditService;
        this.auditClient = auditClient;
        this.featureFlags = featureFlags;
    }

    /**
     * First path segment after {@code /pharmaTrack/} → canonical module name.
     * Values come from {@link AuditModules} so the producer emits exactly the
     * names the Audit Service RBAC scopes on (Wave 2.1). {@code notifications} and
     * unmapped URIs resolve to the non-canonical sentinels
     * {@link AuditModules#NOTIFICATIONS} / {@link AuditModules#UNKNOWN}, which are
     * intentionally not RBAC-scoped.
     */
    static String moduleFor(String uri) {
        if (uri == null) return AuditModules.UNKNOWN;
        String[] p = uri.split("/");
        String seg = (p.length > 2) ? p[2] : "";
        return switch (seg) {
            case "clinicalTrial", "trialProtocol", "trialSite" -> AuditModules.CLINICAL_TRIAL;
            case "subjectEnrolment" -> AuditModules.SUBJECT_ENROLLMENT;
            case "batchManufacturing" -> AuditModules.BATCH_MANUFACTURING;
            case "supplyColdManagement" -> AuditModules.SUPPLY_CHAIN;
            case "deviationCapa" -> AuditModules.DEVIATION_CAPA;
            case "regulatoryAffairs" -> AuditModules.REGULATORY_AFFAIRS;
            case "notifications" -> AuditModules.NOTIFICATIONS;
            case "identityAccess" -> AuditModules.IDENTITY_ACCESS_MANAGEMENT;
            default -> AuditModules.UNKNOWN;
        };
    }

    /**
     * Redacts sensitive values (passwords, secrets, tokens) from a captured
     * request-body dump so they are never stored in the audit ledger or written to
     * logs. Handles both the Lombok {@code Name(field=value, ...)} toString form and
     * JSON ({@code "field":"value"}). 21 CFR Part 11 / security requirement:
     * passwords must never appear in audit events, details, logs, or the UI.
     */
    static String redactSensitive(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.replaceAll(
                "(?i)(\"?(?:password|passwd|pwd|newPassword|confirmPassword|currentPassword|oldPassword|secret|otp|pin|token|credential)\"?\\s*[:=]\\s*)(\"[^\"]*\"|[^,)}\\]]*)",
                "$1[REDACTED]");
    }

    /** Serialize the controller's request-body argument (if any) as the new value. */
    private String newValueFrom(JoinPoint joinPoint) {
        for (Object arg : joinPoint.getArgs()) {
            if (arg == null) continue;
            if (arg instanceof HttpServletRequest || arg instanceof HttpServletResponse) continue;
            if (arg instanceof CharSequence || arg instanceof Number || arg instanceof Boolean) continue;
            return redactSensitive(String.valueOf(arg));   // Lombok @Data DTOs render a readable field dump
        }
        return null;
    }

    @Pointcut("execution(* com.cts.pharmaTrack..controller..*(..))")
    public void controllerMethods() {
    }

    @AfterReturning("controllerMethods()")
    public void audit(JoinPoint joinPoint) {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return;
            }
            HttpServletRequest request = attrs.getRequest();
            String httpMethod = request.getMethod();
            String action = ACTIONS.get(httpMethod);
            if (action == null) {
                return; // only audit mutating operations
            }

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String userId = (auth != null && auth.getName() != null) ? auth.getName() : "anonymous";

            String entityType = joinPoint.getSignature().getDeclaringType().getSimpleName()
                    .replaceAll("Controller$", "");

            AuditData data = new AuditData();
            data.eventId = UUID.randomUUID().toString();
            data.userId = userId;
            data.action = action;
            data.entityType = entityType;
            data.recordId = resolveRecordId(request);
            data.reason = request.getHeader("X-Audit-Reason");
            data.endpoint = request.getRequestURI();
            data.module = moduleFor(request.getRequestURI());
            data.newValue = newValueFrom(joinPoint);
            data.performedByName = displayNameOf(auth);
            data.performedAt = LocalDateTime.now();
            data.correlationId = correlationId(request);
            data.ipAddress = request.getRemoteAddr();
            data.bearerToken = request.getHeader(HttpHeaders.AUTHORIZATION);

            dispatch(data);
        } catch (Exception ex) {
            log.warn("Audit logging failed (business operation unaffected): {}", ex.getMessage());
        }
    }

    /**
     * Routes one audit record to the central service and/or the local table
     * according to the feature flags. Central success skips the local write;
     * central failure falls back to local only when fallback is enabled.
     */
    void dispatch(AuditData data) {
        if (featureFlags.isAuditCentralEnabled()) {
            boolean published = auditClient.publish(toCentral(data), data.bearerToken);
            if (!published && featureFlags.isAuditLocalFallbackEnabled()) {
                recordLocal(data);
            }
        } else if (featureFlags.isAuditLocalFallbackEnabled()) {
            recordLocal(data);
        }
    }

    private void recordLocal(AuditData d) {
        auditService.record(d.userId, d.action, d.entityType, d.recordId,
                d.reason, d.endpoint, d.module, d.newValue);
    }

    private CentralAuditEvent toCentral(AuditData d) {
        CentralAuditEvent e = new CentralAuditEvent();
        e.setEventId(d.eventId);
        e.setModule(d.module);
        e.setEntityType(d.entityType);
        e.setEntityId(d.recordId);
        e.setAction(d.action);
        e.setPerformedBy(d.userId);
        e.setPerformedByName(d.performedByName);
        e.setPerformedAt(d.performedAt);
        e.setNewValues(d.newValue);       // reason/endpoint have no central column
        e.setCorrelationId(d.correlationId);
        e.setIpAddress(d.ipAddress);
        return e;
    }

    private static String displayNameOf(Authentication auth) {
        if (auth != null && auth.getPrincipal() instanceof SignedPrincipal p) {
            return p.getDisplayName();
        }
        return null;
    }

    /** Correlation id from the CorrelationIdFilter MDC, falling back to the header. */
    private static String correlationId(HttpServletRequest request) {
        String fromMdc = MDC.get(CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
        if (fromMdc != null && !fromMdc.isBlank()) {
            return fromMdc;
        }
        return request.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
    }

    /**
     * Best-effort record identifier: a request param whose name contains "id",
     * else a URI path variable whose name contains "id" (e.g. {@code /updateUser/{userId}}),
     * else {@code null}.
     *
     * <p>Returns {@code null} (not a {@code "-"} sentinel) when no id is found: the
     * old sentinel is not a meaningful entityId in the central store and — because
     * some services back the local {@code audit_log} with a numeric {@code recordId}
     * column — a non-numeric {@code "-"} makes the local-fallback insert fail
     * ("Incorrect integer value: '-'"). A null maps cleanly to a NULL column.
     */
    private String resolveRecordId(HttpServletRequest request) {
        for (Map.Entry<String, String[]> e : request.getParameterMap().entrySet()) {
            if (e.getKey().toLowerCase().contains("id") && e.getValue().length > 0) {
                return e.getValue()[0];
            }
        }
        // Path variables are set by Spring MVC as a request attribute (available in
        // the @AfterReturning advice); the constant is inlined to avoid a hard
        // dependency on the HandlerMapping type here.
        Object pathVars = request.getAttribute(
                "org.springframework.web.servlet.HandlerMapping.uriTemplateVariables");
        if (pathVars instanceof Map<?, ?> vars) {
            for (Map.Entry<?, ?> e : vars.entrySet()) {
                if (e.getValue() != null
                        && String.valueOf(e.getKey()).toLowerCase().contains("id")) {
                    return String.valueOf(e.getValue());
                }
            }
        }
        return null;
    }

    /**
     * Mutable holder for the fields captured from one request, assembled once and
     * consumed by both the local and central write paths. Package-private so the
     * routing in {@link #dispatch} can be unit-tested without a servlet context.
     */
    static final class AuditData {
        String eventId;
        String userId;
        String action;
        String entityType;
        String recordId;
        String reason;
        String endpoint;
        String module;
        String newValue;
        String performedByName;
        LocalDateTime performedAt;
        String correlationId;
        String ipAddress;
        String bearerToken;
    }
}
