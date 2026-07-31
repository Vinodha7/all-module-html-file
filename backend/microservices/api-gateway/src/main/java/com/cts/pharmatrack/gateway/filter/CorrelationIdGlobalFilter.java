package com.cts.pharmatrack.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Ensures every request entering the platform carries a correlation id for
 * end-to-end traceability across services.
 *
 * <p>Reads the {@code X-Correlation-Id} header from the incoming request
 * (generating a UUID when absent or blank), mutates the forwarded request so the
 * id reaches downstream services (where the servlet {@code CorrelationIdFilter}
 * reuses it instead of generating a new one), and echoes it on the response.
 *
 * <p>Runs at {@link Ordered#HIGHEST_PRECEDENCE} — ahead of
 * {@code GlobalRateLimitingFilter} — so the id is established (and appears on the
 * response) even when a request is rejected with 429.
 */
@Component
public class CorrelationIdGlobalFilter implements GlobalFilter, Ordered {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String incoming = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);
        String correlationId = (incoming != null && !incoming.isBlank())
                ? incoming
                : UUID.randomUUID().toString();

        // Mutate the forwarded request so downstream services receive the id.
        ServerWebExchange mutated = exchange.mutate()
                .request(builder -> builder.headers(headers ->
                        headers.set(CORRELATION_ID_HEADER, correlationId)))
                .build();

        // Set the response header just before commit so it survives downstream
        // response writing (including a 429 from the rate limiter).
        mutated.getResponse().beforeCommit(() -> {
            mutated.getResponse().getHeaders().set(CORRELATION_ID_HEADER, correlationId);
            return Mono.empty();
        });

        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
