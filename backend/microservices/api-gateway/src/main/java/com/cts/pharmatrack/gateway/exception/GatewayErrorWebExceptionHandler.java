package com.cts.pharmatrack.gateway.exception;

import com.cts.pharmatrack.gateway.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.server.WebExceptionHandler;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Maps unhandled gateway exceptions to a JSON error response.
 * <p>
 * This handler is used for WebFlux exceptions that occur outside the controller
 * stack, including gateway filter and routing failures.
 * </p>
 */
@Component
@Order(-2)
public final class GatewayErrorWebExceptionHandler implements WebExceptionHandler, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(GatewayErrorWebExceptionHandler.class);

    private final ObjectMapper objectMapper;

    public GatewayErrorWebExceptionHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
        ServerHttpResponse response = exchange.getResponse();
        if (response.isCommitted()) {
            return Mono.error(ex);
        }

        HttpStatus status = resolveStatus(ex);
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        ErrorResponse errorResponse = new ErrorResponse(
                status.value(),
                status.getReasonPhrase().replace(' ', '_').toUpperCase(),
                ex.getMessage() != null ? ex.getMessage() : "Unexpected error",
                exchange.getRequest().getPath().value()
        );

        byte[] body;
        try {
            body = objectMapper.writeValueAsBytes(errorResponse);
        } catch (Exception mappingFailure) {
            logger.error("Failed to serialize error response", mappingFailure);
            return Mono.error(mappingFailure);
        }

        logger.error("Gateway exception handled with status {}: {}", status.value(), ex.getMessage(), ex);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
    }

    private HttpStatus resolveStatus(Throwable ex) {
        if (ex instanceof RateLimitExceededException) {
            return HttpStatus.TOO_MANY_REQUESTS;
        }
        if (ex instanceof ResponseStatusException statusException) {
            try {
                var statusCode = statusException.getStatusCode();
                HttpStatus resolved = HttpStatus.resolve(statusCode.value());
                return resolved != null ? resolved : HttpStatus.INTERNAL_SERVER_ERROR;
            } catch (Exception e) {
                return HttpStatus.INTERNAL_SERVER_ERROR;
            }
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    @Override
    public int getOrder() {
        return -2;
    }
}
