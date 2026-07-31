package com.cts.pharmatrack.gateway.config;

import io.github.resilience4j.micrometer.tagged.TaggedRateLimiterMetrics;
import io.github.resilience4j.ratelimiter.RateLimiter;
import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Configures a shared Resilience4j RateLimiter registry for Spring Cloud Gateway.
 * <p>
 * This configuration is intentionally decoupled from Spring Cloud Gateway's built-in
 * RequestRateLimiter filter so that the gateway can enforce a pure Resilience4j
 * rate limiter without requiring Redis or a separate key resolver.
 *</p>
 */
@Configuration
@ConfigurationProperties(prefix = "resilience4j.ratelimiter.instances.global-rate-limiter")
public class RateLimiterConfiguration {

    private static final Logger logger = LoggerFactory.getLogger(RateLimiterConfiguration.class);

    private Duration limitRefreshPeriod = Duration.ofMinutes(1);
    private int limitForPeriod = 5;
    private Duration timeoutDuration = Duration.ZERO;

    public Duration getLimitRefreshPeriod() {
        return limitRefreshPeriod;
    }

    public void setLimitRefreshPeriod(Duration limitRefreshPeriod) {
        this.limitRefreshPeriod = limitRefreshPeriod;
    }

    public int getLimitForPeriod() {
        return limitForPeriod;
    }

    public void setLimitForPeriod(int limitForPeriod) {
        this.limitForPeriod = limitForPeriod;
    }

    public Duration getTimeoutDuration() {
        return timeoutDuration;
    }

    public void setTimeoutDuration(Duration timeoutDuration) {
        this.timeoutDuration = timeoutDuration;
    }

    @Bean
    public RateLimiterRegistry rateLimiterRegistry(MeterRegistry meterRegistry) {
        RateLimiterConfig config = RateLimiterConfig.custom()
                .limitRefreshPeriod(limitRefreshPeriod)
                .limitForPeriod(limitForPeriod)
                .timeoutDuration(timeoutDuration)
                .build();

        RateLimiterRegistry registry = RateLimiterRegistry.of(config);
        // Register metrics for the RateLimiterRegistry. API expects only the registry.
        TaggedRateLimiterMetrics.ofRateLimiterRegistry(registry);

        logger.info("Registered Resilience4j rate limiter 'global-rate-limiter' with limitForPeriod={} refreshPeriod={} timeoutDuration={}",
                limitForPeriod, limitRefreshPeriod, timeoutDuration);

        return registry;
    }

    @Bean
    public RateLimiter globalRateLimiter(RateLimiterRegistry rateLimiterRegistry) {
        return rateLimiterRegistry.rateLimiter("global-rate-limiter");
    }
}
