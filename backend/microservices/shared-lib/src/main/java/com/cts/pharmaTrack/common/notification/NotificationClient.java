package com.cts.pharmaTrack.common.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

/**
 * Publishes in-app notifications from a producer service (Trial / Batch /
 * ColdChain / Deviation / Regulatory) to the Notification Service
 * ({@code POST /pharmaTrack/notifications/createNotification}).
 *
 * <p>Modelled on {@link com.cts.pharmaTrack.common.audit.AuditClient}: the caller's
 * inbound Bearer token is forwarded so the notification is created under the same
 * JWT that authorized the business action. The base URL is read from
 * {@code pharmatrack.notifications.base-url} (defaults to the notification-service
 * port), and the whole feature can be switched off with
 * {@code pharmatrack.notifications.enabled=false}.
 *
 * <p>{@link #publish} never throws and never blocks the business operation: any
 * error — missing configuration, transport failure, or a non-2xx response — is
 * logged and reported as {@code false}. Firing a notification must never break the
 * create/update that triggered it.
 */
@Component
public class NotificationClient {

    private static final Logger log = LoggerFactory.getLogger(NotificationClient.class);

    private static final String CREATE_PATH = "/pharmaTrack/notifications/createNotification";

    private final RestClient restClient;
    private final String baseUrl;
    private final boolean enabled;

    public NotificationClient(ObjectProvider<RestClient.Builder> restClientBuilder,
                              @Value("${pharmatrack.notifications.base-url:http://localhost:8088}") String baseUrl,
                              @Value("${pharmatrack.notifications.enabled:true}") boolean enabled) {
        // Mirror AuditClient: fall back to a plain builder so this bean constructs
        // on every service; a service-defined configured builder is preferred.
        this.restClient = restClientBuilder.getIfAvailable(RestClient::builder).build();
        this.baseUrl = baseUrl;
        this.enabled = enabled;
    }

    /**
     * Publishes one notification to the Notification Service.
     *
     * @param payload     the notification body ({@code userId}, {@code message},
     *                    {@code category})
     * @param bearerToken the caller's inbound {@code Authorization} header value
     *                    (e.g. {@code "Bearer <jwt>"}), forwarded for JWT auth;
     *                    may be {@code null} when the request was unauthenticated
     * @return {@code true} on a 2xx response, {@code false} on any failure
     *         (including missing configuration or the feature being disabled)
     */
    public boolean publish(Object payload, String bearerToken) {
        if (!enabled) {
            return false;
        }
        if (!StringUtils.hasText(baseUrl)) {
            log.warn("Notification publish skipped: base-url not configured "
                    + "(pharmatrack.notifications.base-url)");
            return false;
        }
        try {
            RestClient.RequestBodySpec request = restClient.post()
                    .uri(baseUrl + CREATE_PATH)
                    .contentType(MediaType.APPLICATION_JSON);
            if (StringUtils.hasText(bearerToken)) {
                request = request.header(HttpHeaders.AUTHORIZATION, bearerToken);
            }
            request.body(payload).retrieve().toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.warn("Notification publish failed (business operation unaffected): {}",
                    ex.getMessage());
            return false;
        }
    }
}
