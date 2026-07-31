package com.cts.pharmaTrack.module.identityAccessManagement.config;

import com.cts.pharmaTrack.module.identityAccessManagement.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http)
            throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                        SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // â"€â"€ Swagger & API Docs â"€â"€
                .requestMatchers(
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/swagger-ui.html"
                ).permitAll()
                // â”€â”€ Public endpoints â€” no token required â”€â”€
                .requestMatchers(
                    "/pharmaTrack/identityAccess/auth/login",
                    "/pharmaTrack/identityAccess/auth/resetPassword",
                    "/pharmaTrack/identityAccess/auth/verifyToken/**",
                    "/pharmaTrack/identityAccess/auth/logout"
                ).permitAll()

                // â”€â”€ All authenticated roles â”€â”€
                // Wave 3 entity-based e-signatures: any authenticated approver
                // (PI, QA Analyst, Regulatory Affairs Officer, ...) may sign and
                // read/verify — the signer identity is bound from the JWT principal,
                // not a role gate. (Legacy signAuditLog stays Admin-only below.)
                .requestMatchers(
                    "/pharmaTrack/identityAccess/auth/me",
                    "/pharmaTrack/identityAccess/signatures",
                    "/pharmaTrack/identityAccess/signatures/all",
                    "/pharmaTrack/identityAccess/verifySignatures"
                ).authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.GET,
                    "/pharmaTrack/identityAccess/products",
                    "/pharmaTrack/identityAccess/sites"
                ).authenticated()

                // â”€â”€ Admin only â”€â”€
                .requestMatchers(org.springframework.http.HttpMethod.POST,
                    "/pharmaTrack/identityAccess/products",
                    "/pharmaTrack/identityAccess/sites"
                ).hasRole("Admin")
                .requestMatchers(
                    "/pharmaTrack/identityAccess/createUser",
                    "/pharmaTrack/identityAccess/createRole",
                    "/pharmaTrack/identityAccess/fetchUsers",
                    "/pharmaTrack/identityAccess/fetchUserById/**",
                    "/pharmaTrack/identityAccess/updateUser/**",
                    "/pharmaTrack/identityAccess/updateUserStatus/**",
                    "/pharmaTrack/identityAccess/deactivateUser/**",
                    "/pharmaTrack/identityAccess/unlockUser/**",
                    "/pharmaTrack/identityAccess/fetchLockedUsers",
                    "/pharmaTrack/identityAccess/fetchLoggedInUsers",
                    "/pharmaTrack/identityAccess/fetchRoles",
                    "/pharmaTrack/identityAccess/createPermission",
                    "/pharmaTrack/identityAccess/fetchPermissionsByRole/**",
                    "/pharmaTrack/identityAccess/fetchSessionsByUser/**",
                    "/pharmaTrack/identityAccess/forceLogout/**",
                    "/pharmaTrack/identityAccess/fetchAuditLogs",
                    "/pharmaTrack/identityAccess/fetchAuditLogsByUser/**",
                    "/pharmaTrack/identityAccess/fetchAuditLogsByModule/**",
                    "/pharmaTrack/identityAccess/fetchAuditLogsByAction/**",
                    "/pharmaTrack/identityAccess/fetchAuditLogsFiltered",
                    "/pharmaTrack/identityAccess/fetchAuditLogsSummary",
                    "/pharmaTrack/identityAccess/exportAuditLogs",
                    "/pharmaTrack/identityAccess/verifyAuditLogIntegrity",
                    "/pharmaTrack/identityAccess/signAuditLog/**",
                    "/pharmaTrack/identityAccess/fetchAuditLogSignatures/**",
                    "/pharmaTrack/identityAccess/fetchComplianceDashboard"
                ).hasRole("Admin")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter,
                    UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}