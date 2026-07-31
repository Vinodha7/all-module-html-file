package com.cts.pharmaTrack.common.exception;

/**
 * 503 - thrown when a downstream service is unavailable or unreachable.
 * Typically used in circuit breaker fallback patterns.
 */
public class ServiceUnavailableException extends RuntimeException {

    private String serviceName;
    private String errorCode;

    public ServiceUnavailableException(String message) {
        super(message);
        this.errorCode = "SERVICE_UNAVAILABLE";
    }

    public ServiceUnavailableException(String serviceName, String message) {
        super(message);
        this.serviceName = serviceName;
        this.errorCode = "SERVICE_" + serviceName.toUpperCase() + "_UNAVAILABLE";
    }

    public ServiceUnavailableException(String serviceName, String message, String errorCode) {
        super(message);
        this.serviceName = serviceName;
        this.errorCode = errorCode;
    }

    public String getServiceName() {
        return serviceName;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
