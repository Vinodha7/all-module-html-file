package com.cts.pharmaTrack.module.audit.config;

import com.cts.pharmaTrack.common.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Stateless JWT security for the Audit Service (finalized in A14).
 *
 * <p>Swagger and actuator are open. Ingest ({@code POST /events}) requires a valid
 * JWT here and a valid {@code X-Internal-Token} via {@code InternalTokenFilter}.
 * The integrity endpoint is restricted to Admin/Auditor; all other endpoints
 * require authentication. Module-scoped read RBAC is applied on results by the
 * query service, not in this chain.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    // ── Open ──
                    .requestMatchers(
                            "/swagger-ui/**",
                            "/v3/api-docs/**",
                            "/swagger-ui.html"
                    ).permitAll()
                    .requestMatchers("/actuator/**").permitAll()
                    // ── Integrity report: Admin or Auditor only ──
                    .requestMatchers(HttpMethod.GET, "/pharmaTrack/audit/verifyIntegrity")
                            .hasAnyRole("Admin", "Auditor")
                    // ── Ingest: valid JWT required (X-Internal-Token enforced by
                    //    InternalTokenFilter) ──
                    .requestMatchers(HttpMethod.POST, "/pharmaTrack/audit/events")
                            .authenticated()
                    // ── All other endpoints (GET reads, etc.): JWT only ──
                    .anyRequest().authenticated())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
