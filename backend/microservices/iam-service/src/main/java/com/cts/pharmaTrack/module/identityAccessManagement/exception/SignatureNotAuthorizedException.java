package com.cts.pharmaTrack.module.identityAccessManagement.exception;

/**
 * Raised (Wave 3.1) when the authenticated role is not permitted to apply a
 * signature of the requested {@code meaning} to the requested {@code entityType}.
 * Mapped to HTTP 403 by {@code IdentityAccessExceptionHandler}.
 */
public class SignatureNotAuthorizedException extends RuntimeException {
    public SignatureNotAuthorizedException(String message) {
        super(message);
    }
}
