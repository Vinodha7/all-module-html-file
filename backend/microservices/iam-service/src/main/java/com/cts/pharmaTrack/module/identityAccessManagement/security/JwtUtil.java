package com.cts.pharmaTrack.module.identityAccessManagement.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expirationMs;

    private static final long RENEWAL_THRESHOLD_MS = 10 * 60 * 1000;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    public String generateToken(Integer userId, Integer roleId, String role,
                                Integer siteId, String email, String name) {
        // Map.of rejects null values (e.g. a null siteId would throw). Build a
        // null-tolerant map and include only claims that are present. Existing
        // claims are unchanged; "name" is added.
        Map<String, Object> claims = new LinkedHashMap<>();
        putIfPresent(claims, "userId", userId);
        putIfPresent(claims, "roleId", roleId);
        putIfPresent(claims, "role",   role);
        putIfPresent(claims, "siteId", siteId);
        putIfPresent(claims, "email",  email);
        putIfPresent(claims, "name",   name);
        return Jwts.builder()
                .setClaims(claims)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    private static void putIfPresent(Map<String, Object> claims, String key, Object value) {
        if (value != null) {
            claims.put(key, value);
        }
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

    public Integer getUserId(String token) {
        return (Integer) parseClaims(token).get("userId");
    }

    public String getRole(String token) {
        return (String) parseClaims(token).get("role");
    }

    public String getEmail(String token) {
        return (String) parseClaims(token).get("email");
    }

    public String getName(String token) {
        return (String) parseClaims(token).get("name");
    }

    public Integer getRoleId(String token) {
        return (Integer) parseClaims(token).get("roleId");
    }

    public Integer getSiteId(String token) {
        return (Integer) parseClaims(token).get("siteId");
    }

    public boolean needsRenewal(String token) {
        Date expiry = parseClaims(token).getExpiration();
        long remaining = expiry.getTime() - System.currentTimeMillis();
        return remaining < RENEWAL_THRESHOLD_MS;
    }

    public String renewToken(String token) {
        Claims claims = parseClaims(token);
        return generateToken(
                (Integer) claims.get("userId"),
                (Integer) claims.get("roleId"),
                (String)  claims.get("role"),
                (Integer) claims.get("siteId"),
                (String)  claims.get("email"),
                (String)  claims.get("name")
        );
    }
}