package com.cts.pharmaTrack.common.audit;

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
 * Publishes audit events from a producer service to the central Audit Service
 * ({@code POST /pharmaTrack/audit/events}, Wave 1). Introduced in Wave 2.
 *
 * <p>Service-to-service authentication mirrors what the Audit Service enforces:
 * a valid JWT (the caller's inbound Bearer token is forwarded) <em>and</em> the
 * shared-secret {@code X-Internal-Token}. The token is read from
 * {@code pharmatrack.audit.internal-token} — the same key the Audit Service binds
 * as its expected value — and the base URL from
 * {@code pharmatrack.audit.central.base-url}.
 *
 * <p>This bean is registered on every service that depends on
 * {@code pharmatrack-common}, but it is only exercised when
 * {@code pharmatrack.features.audit-central-enabled} is set (the {@link AuditAspect}
 * gates the call). {@link #publish} never throws and never blocks the business
 * operation: any error — missing configuration, transport failure, or a non-2xx
 * response — is logged and reported as {@code false} so the aspect can fall back
 * to the local write.
 */
@Component
public class AuditClient {

    private static final Logger log = LoggerFactory.getLogger(AuditClient.class);

    private static final String EVENTS_PATH = "/pharmaTrack/audit/events";
    static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";

    private final RestClient restClient;
    private final String baseUrl;
    private final String internalToken;

    public AuditClient(ObjectProvider<RestClient.Builder> restClientBuilder,
                       @Value("${pharmatrack.audit.central.base-url:http://localhost:8089}") String baseUrl,
                       @Value("${pharmatrack.audit.internal-token:}") String internalToken) {
        // Boot 4's modular auto-config does not always expose a RestClient.Builder
        // bean under spring-boot-starter-webmvc; fall back to a plain builder so
        // this bean constructs on every service (it is only *used* when central
        // publishing is enabled). If a service does define a configured builder,
        // that one is preferred.
        this.restClient = restClientBuilder.getIfAvailable(RestClient::builder).build();
        this.baseUrl = baseUrl;
        this.internalToken = internalToken;
    }

    /**
     * Publishes one audit event to the central Audit Service.
     *
     * @param event       the event payload (server stamps receivedAt/source/rowHash)
     * @param bearerToken the caller's inbound {@code Authorization} header value
     *                    (e.g. {@code "Bearer <jwt>"}), forwarded for JWT auth;
     *                    may be {@code null} when the request was unauthenticated
     * @return {@code true} on a 2xx response, {@code false} on any failure
     *         (including missing configuration) — the caller must not rethrow
     */
    public boolean publish(CentralAuditEvent event, String bearerToken) {
        if (!StringUtils.hasText(baseUrl) || !StringUtils.hasText(internalToken)) {
            log.warn("Central audit publish skipped: base-url or internal-token not configured "
                    + "(pharmatrack.audit.central.base-url / pharmatrack.audit.internal-token)");
            return false;
        }
        try {
            RestClient.RequestBodySpec request = restClient.post()
                    .uri(baseUrl + EVENTS_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(INTERNAL_TOKEN_HEADER, internalToken);
            if (StringUtils.hasText(bearerToken)) {
                request = request.header(HttpHeaders.AUTHORIZATION, bearerToken);
            }
            // retrieve() throws on 4xx/5xx; toBodilessEntity() ignores the body.
            request.body(event).retrieve().toBodilessEntity();
            return true;
        } catch (Exception ex) {
            log.warn("Central audit publish failed for eventId={} (will fall back if enabled): {}",
                    event.getEventId(), ex.getMessage());
            return false;
        }
    }
}
