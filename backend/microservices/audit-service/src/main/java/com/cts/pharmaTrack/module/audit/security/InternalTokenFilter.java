package com.cts.pharmaTrack.module.audit.security;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Enforces the shared-secret {@code X-Internal-Token} header on the audit ingest
 * endpoint ({@code POST /pharmaTrack/audit/events}) only. All other requests pass
 * through untouched (see {@link #shouldNotFilter}).
 *
 * <p>This is a service-to-service guard layered on top of JWT authentication:
 * ingest requires both a valid JWT (enforced by the security chain) and a valid
 * internal token (enforced here). The expected token is read from
 * {@code pharmatrack.audit.internal-token} (env {@code AUDIT_INTERNAL_TOKEN}); the
 * service fails to start if it is missing or blank.
 */
@Component
public class InternalTokenFilter extends OncePerRequestFilter {

    static final String INTERNAL_TOKEN_HEADER = "X-Internal-Token";
    private static final String EVENTS_PATH = "/pharmaTrack/audit/events";

    private final String internalToken;

    public InternalTokenFilter(@Value("${pharmatrack.audit.internal-token}") String internalToken) {
        this.internalToken = internalToken;
    }

    @PostConstruct
    void validate() {
        if (!StringUtils.hasText(internalToken)) {
            throw new IllegalStateException(
                    "pharmatrack.audit.internal-token (env AUDIT_INTERNAL_TOKEN) must be set and non-blank");
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Guard only POST /pharmaTrack/audit/events; skip every other request.
        return !("POST".equalsIgnoreCase(request.getMethod())
                && EVENTS_PATH.equals(request.getRequestURI()));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        if (!isValid(request.getHeader(INTERNAL_TOKEN_HEADER))) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"status\":\"error\",\"message\":\"Invalid or missing X-Internal-Token\"}");
            return;
        }
        filterChain.doFilter(request, response);
    }

    /** Constant-time comparison to avoid leaking the secret via timing. */
    private boolean isValid(String provided) {
        if (!StringUtils.hasText(provided)) {
            return false;
        }
        return MessageDigest.isEqual(
                provided.getBytes(StandardCharsets.UTF_8),
                internalToken.getBytes(StandardCharsets.UTF_8));
    }
}
