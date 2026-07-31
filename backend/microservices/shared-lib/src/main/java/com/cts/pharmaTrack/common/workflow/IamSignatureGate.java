package com.cts.pharmaTrack.common.workflow;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

/**
 * Default {@link SignatureGate}: verifies a signature by calling the IAM service's
 * {@code GET /pharmaTrack/identityAccess/verifySignatures} endpoint (Wave 3), which
 * recomputes each signature's hash and returns a per-signature {@code valid} flag.
 *
 * <p>Base URL from {@code pharmatrack.iam.base-url} (default the local IAM port).
 * The caller's Bearer token is forwarded. Fails closed: any error or a
 * non-matching/invalid signature yields {@code null}.
 */
@Component
public class IamSignatureGate implements SignatureGate {

    private static final Logger log = LoggerFactory.getLogger(IamSignatureGate.class);
    private static final String VERIFY_PATH = "/pharmaTrack/identityAccess/verifySignatures";

    private final RestClient restClient;
    private final String iamBaseUrl;

    public IamSignatureGate(ObjectProvider<RestClient.Builder> restClientBuilder,
                            @Value("${pharmatrack.iam.base-url:http://localhost:8081}") String iamBaseUrl) {
        this.restClient = restClientBuilder.getIfAvailable(RestClient::builder).build();
        this.iamBaseUrl = iamBaseUrl;
    }

    @Override
    public Integer resolveSignatureId(String entityType, String entityId, String entityVersion,
                                      String requiredMeaning, String bearerToken) {
        try {
            RestClient.RequestHeadersSpec<?> request = restClient.get()
                    .uri(iamBaseUrl + VERIFY_PATH + "?entityType={t}&entityId={id}", entityType, entityId);
            if (StringUtils.hasText(bearerToken)) {
                request = request.header(HttpHeaders.AUTHORIZATION, bearerToken);
            }
            JsonNode body = request.retrieve().body(JsonNode.class);
            if (body == null) {
                return null;
            }
            JsonNode signatures = body.path("data").path("signatures");
            if (!signatures.isArray()) {
                return null;
            }
            for (JsonNode sig : signatures) {
                boolean valid = sig.path("valid").asBoolean(false);
                String meaning = sig.path("meaning").asText(null);
                String version = sig.path("entityVersion").asText(null);
                if (valid && requiredMeaning.equals(meaning)
                        && (entityVersion == null || entityVersion.equals(version))) {
                    return sig.path("signatureId").isInt() ? sig.path("signatureId").asInt() : null;
                }
            }
            return null;
        } catch (Exception ex) {
            // Fail closed — an unverifiable signature must not let a gated transition through.
            log.warn("Signature verification via IAM failed for {} {} v{} ({}): {}",
                    entityType, entityId, entityVersion, requiredMeaning, ex.getMessage());
            return null;
        }
    }
}
