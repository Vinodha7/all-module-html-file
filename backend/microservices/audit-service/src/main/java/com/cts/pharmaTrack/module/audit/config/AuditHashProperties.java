package com.cts.pharmaTrack.module.audit.config;

import jakarta.annotation.PostConstruct;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Binds the Audit Service's HMAC secret from {@code pharmatrack.audit.hmac-key}
 * (sourced from the {@code AUDIT_HMAC_KEY} environment variable).
 *
 * <p>The key is held outside the database so that a party with database write
 * access still cannot forge a valid {@code row_hash}. Startup fails fast if the
 * key is missing or blank — the service must never run without tamper-evidence.
 */
@Component
@ConfigurationProperties(prefix = "pharmatrack.audit")
public class AuditHashProperties {

    /** Secret used as the HMAC-SHA256 key. Required, non-blank. */
    private String hmacKey;

    public String getHmacKey() {
        return hmacKey;
    }

    public void setHmacKey(String hmacKey) {
        this.hmacKey = hmacKey;
    }

    @PostConstruct
    void validate() {
        if (!StringUtils.hasText(hmacKey)) {
            throw new IllegalStateException(
                    "pharmatrack.audit.hmac-key (env AUDIT_HMAC_KEY) must be set and non-blank");
        }
    }
}
