package com.cts.pharmaTrack.common.exception;

/**
 * 403 - thrown when a role attempts to access an endpoint it is not allowed to.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }
}
