package com.cts.pharmaTrack.common.notification;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Convenience entry point the five business modules use to raise an in-app
 * notification when a domain event occurs (creation / update / status change of a
 * Trial, Batch, ColdChain log, Deviation/CAPA or Regulatory record).
 *
 * <p>The notification is addressed to the <strong>acting user</strong> — the
 * identity taken from the current {@code SecurityContext} (the same email that
 * {@code Authentication.getName()} returns and that the audit trail records). The
 * caller's Bearer token is picked up from the current HTTP request and forwarded
 * so the create is authorized under that same JWT.
 *
 * <p>Every method is best-effort and swallows all errors: raising a notification
 * must never fail or roll back the business operation that triggered it.
 */
@Component
public class NotificationPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationPublisher.class);

    /** Canonical category values understood by the Notification Service. */
    public static final String TRIAL = "Trial";
    public static final String BATCH = "Batch";
    public static final String COLD_CHAIN = "ColdChain";
    public static final String DEVIATION = "Deviation";
    public static final String REGULATORY = "Regulatory";

    /** Fallback userId when the request is unauthenticated (should not normally happen). */
    private static final String SYSTEM_USER = "system";

    private final NotificationClient notificationClient;

    public NotificationPublisher(NotificationClient notificationClient) {
        this.notificationClient = notificationClient;
    }

    /**
     * Raises a notification for the acting user.
     *
     * @param category one of {@link #TRIAL}, {@link #BATCH}, {@link #COLD_CHAIN},
     *                 {@link #DEVIATION}, {@link #REGULATORY}
     * @param message  human-readable description of the event
     */
    public void notify(String category, String message) {
        try {
            if (!StringUtils.hasText(message)) {
                return;
            }
            String userId = currentUserId();
            Map<String, String> body = new LinkedHashMap<>();
            body.put("userId", StringUtils.hasText(userId) ? userId : SYSTEM_USER);
            body.put("message", message);
            body.put("category", category);
            notificationClient.publish(body, currentBearerToken());
        } catch (Exception ex) {
            // Never let a notification failure affect the business operation.
            log.warn("Failed to raise {} notification (business operation unaffected): {}",
                    category, ex.getMessage());
        }
    }

    /** Acting user's email from the SecurityContext, or {@code null} if unauthenticated. */
    private String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : null;
    }

    /** The inbound {@code Authorization} header of the current request, if any. */
    private String currentBearerToken() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest request = attrs.getRequest();
            return request.getHeader(HttpHeaders.AUTHORIZATION);
        }
        return null;
    }
}
