package com.cts.pharmatrack.gateway.controller;

import com.cts.pharmaTrack.common.exception.ServiceUnavailableException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

/**
 * Generic fallback controller for all gateway circuit-breaker routes.
 * <p>
 * When a downstream service's circuit breaker is OPEN (or a call fails), the
 * gateway forwards to {@code /fallback/{service}}. This handler throws a
 * {@link ServiceUnavailableException} carrying the service name so the
 * {@code GlobalExceptionHandler} returns a consistent 503 response with a
 * clear, service-specific error code instead of a generic 500.
 * </p>
 */
@RestController
@RequestMapping("/fallback")
public class GenericFallbackController {

    @RequestMapping(value = "/{service}", method = {
        RequestMethod.GET,
        RequestMethod.POST,
        RequestMethod.PUT,
        RequestMethod.DELETE,
        RequestMethod.PATCH,
        RequestMethod.OPTIONS,
        RequestMethod.HEAD
    }, produces = MediaType.APPLICATION_JSON_VALUE)
    public void fallback(@PathVariable("service") String service) {
        throw new ServiceUnavailableException(
            service,
            "The " + service + " service is currently unavailable. Please try again later.",
            service.toUpperCase() + "_SERVICE_DOWN"
        );
    }
}
