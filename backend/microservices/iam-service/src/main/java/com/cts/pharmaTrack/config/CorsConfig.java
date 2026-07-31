package com.cts.pharmaTrack.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS configuration allowing the Angular frontend (http://localhost:4200) to
 * call every backend endpoint. Exposed as a {@link CorsConfigurationSource}
 * bean so Spring Security's filter chain honours it (via {@code http.cors()}),
 * which is required for the headers to appear on secured responses — an MVC-only
 * {@code WebMvcConfigurer} mapping is bypassed by the security filter chain.
 * The {@code Authorization} header is exposed so the client can read the
 * renewed token the JWT filter writes back.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of("http://localhost:*", "http://localhost"));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization"));
        cfg.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
