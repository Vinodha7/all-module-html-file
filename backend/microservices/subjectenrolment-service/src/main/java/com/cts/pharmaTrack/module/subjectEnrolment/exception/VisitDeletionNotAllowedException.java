package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.ResourceConflictException;

/**
 * 409 - thrown when a visit record cannot be deleted because adverse events
 * still reference it.
 *
 * <p>Extends {@link ResourceConflictException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 409 without any change.
 */
public class VisitDeletionNotAllowedException extends ResourceConflictException {

    public VisitDeletionNotAllowedException() {
        super("Visit cannot be deleted, adverse events exist");
    }

    public VisitDeletionNotAllowedException(String message) {
        super(message);
    }
}
