package com.cts.pharmaTrack.module.identityAccessManagement.security;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserSession;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserSessionRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserSessionRepository sessionRepository;

    JwtFilter(JwtUtil jwtUtil, UserSessionRepository sessionRepository) {
        this.jwtUtil = jwtUtil;
        this.sessionRepository = sessionRepository;
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
            response.getWriter().write(
                "{\"status\":\"error\",\"message\":\"Invalid or expired token\"}");
            return;
        }

        // Fix â€” use Optional properly and call isActive() not getIsActive()
        Optional<UserSession> sessionOpt = sessionRepository.findByToken(token);
        boolean sessionActive = false;
        if (sessionOpt.isPresent()) {
            sessionActive = sessionOpt.get().getIsActive();
        }

        if (!sessionActive) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write(
                "{\"status\":\"error\",\"message\":\"Session is no longer active\"}");
            return;
        }

        Claims claims = jwtUtil.parseClaims(token);
        String role = (String) claims.get("role");
        String email = (String) claims.get("email");
        String name = (String) claims.get("name");
        Integer userId = (Integer) claims.get("userId");

        com.cts.pharmaTrack.common.security.SignedPrincipal principal =
                new com.cts.pharmaTrack.common.security.SignedPrincipal(userId, name, email, role);

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        principal,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Sliding-session renewal is handled explicitly by the
        // POST /auth/refresh endpoint (which re-issues the token and updates the
        // session), so the filter only validates here — keeping a single,
        // conflict-free place that rewrites the session token.
        filterChain.doFilter(request, response);
    }
}