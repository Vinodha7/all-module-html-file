package com.cts.pharmaTrack.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Stateless JWT authentication filter for downstream microservices. Validates
 * the Bearer token's signature/expiry (no session lookup — that lives in the
 * IAM service) and populates the SecurityContext with the user's email as the
 * principal and {@code ROLE_<role>} as the authority, so {@code hasRole(...)}
 * rules in each service's SecurityConfig apply.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtAuthFilter(@Qualifier("jwtValidator") JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        if (!jwtUtil.validateToken(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"status\":\"error\",\"message\":\"Invalid or expired token\"}");
            return;
        }

        Claims claims = jwtUtil.parseClaims(token);
        String role = (String) claims.get("role");
        String email = (String) claims.get("email");

        // Additional identity claims (present on new tokens; null-safe for old ones).
        String name = (claims.get("name") != null) ? claims.get("name").toString() : null;
        Object userIdClaim = claims.get("userId");
        Integer userId = (userIdClaim instanceof Number number) ? number.intValue() : null;

        // Principal carries userId + name for downstream use while getName() still
        // returns the email, preserving existing Authentication.getName() behavior.
        SignedPrincipal principal = new SignedPrincipal(userId, name, email, role);

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        SecurityContextHolder.getContext().setAuthentication(auth);

        filterChain.doFilter(request, response);
    }
}
