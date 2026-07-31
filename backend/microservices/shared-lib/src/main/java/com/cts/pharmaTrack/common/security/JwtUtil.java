package com.cts.pharmaTrack.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;

/**
 * Stateless JWT validation shared by every microservice. Tokens are issued by
 * the IAM service; downstream services only verify the signature/expiry and
 * read the {@code role} and {@code email} claims. The {@code jwt.secret} must
 * match the value the IAM service signs with.
 */
@Component("jwtValidator")
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String getRole(String token) {
        return (String) parseClaims(token).get("role");
    }

    public String getEmail(String token) {
        return (String) parseClaims(token).get("email");
    }

    /**
     * Reads the numeric {@code userId} claim. Returns {@code null} when the claim
     * is absent (e.g. a token issued before the claim existed). Accepts any JSON
     * number representation ({@code Integer}/{@code Long}) and narrows to
     * {@code Integer}, avoiding a {@code ClassCastException}.
     */
    public Integer getUserId(String token) {
        Object value = parseClaims(token).get("userId");
        return (value instanceof Number number) ? number.intValue() : null;
    }

    /**
     * Reads the {@code name} (display name) claim. Returns {@code null} when the
     * claim is absent, so tokens issued before the claim existed do not throw.
     */
    public String getName(String token) {
        Object value = parseClaims(token).get("name");
        return (value != null) ? value.toString() : null;
    }
}
