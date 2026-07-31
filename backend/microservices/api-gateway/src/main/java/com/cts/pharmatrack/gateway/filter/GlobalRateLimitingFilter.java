package com.cts.pharmatrack.gateway.filter;

import com.cts.pharmatrack.gateway.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.ratelimiter.RateLimiter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Global rate limiting filter for the API Gateway.
 * <p>
 * This filter uses a shared Resilience4j RateLimiter instance to enforce
 * a global request threshold for all gateway traffic.
 * </p>
 */
@Component
public final class GlobalRateLimitingFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(GlobalRateLimitingFilter.class);

    private final RateLimiter rateLimiter;
    private final ObjectMapper objectMapper;

    public GlobalRateLimitingFilter(RateLimiter rateLimiter, ObjectMapper objectMapper) {
        this.rateLimiter = rateLimiter;
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return Mono.defer(() -> {
            if (!rateLimiter.acquirePermission()) {
                logger.warn("Rate limit exceeded for request path {}", exchange.getRequest().getPath().value());
                return reject(exchange);
            }
            logger.debug("Rate limiter granted permission for request path {}", exchange.getRequest().getPath().value());
            return chain.filter(exchange);
        });
    }

    @Override
    public int getOrder() {
        // One step after HIGHEST_PRECEDENCE so CorrelationIdGlobalFilter (which is
        // at HIGHEST_PRECEDENCE) runs first and a rejected (429) response still
        // carries X-Correlation-Id.
        return Ordered.HIGHEST_PRECEDENCE + 1;
    }

    private Mono<Void> reject(ServerWebExchange exchange) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        ErrorResponse errorResponse = new ErrorResponse(
                HttpStatus.TOO_MANY_REQUESTS.value(),
                "TOO_MANY_REQUESTS",
                "Too many requests in a short period. Please try again later.",
                exchange.getRequest().getPath().value()
        );

        byte[] body;
        try {
            body = objectMapper.writeValueAsBytes(errorResponse);
        } catch (Exception ex) {
            return Mono.error(ex);
        }

        DataBuffer dataBuffer = response.bufferFactory().wrap(body);
        return response.writeWith(Mono.just(dataBuffer));
    }
}
