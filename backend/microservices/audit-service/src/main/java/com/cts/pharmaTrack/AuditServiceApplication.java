package com.cts.pharmaTrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the centralized Audit Service.
 *
 * <p>Declared in the base package {@code com.cts.pharmaTrack} so the default
 * component scan discovers both this service's own components
 * ({@code com.cts.pharmaTrack.module.audit.*}) and the shared-library
 * components in {@code com.cts.pharmaTrack.common.*} — notably
 * {@code JwtAuthFilter}, {@code FeatureFlags}, and {@code CorrelationIdFilter}.
 */
@SpringBootApplication
public class AuditServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuditServiceApplication.class, args);
    }
}
