package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.ResourceConflictException;

/**
 * 409 - thrown when an adverse event cannot be deleted because its outcome is
 * still open (ongoing / active case).
 *
 * <p>Extends {@link ResourceConflictException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 409 without any change.
 */
public class AdverseEventDeletionNotAllowedException extends ResourceConflictException {

    public AdverseEventDeletionNotAllowedException() {
        super("Event cannot be deleted, active case open");
    }

    public AdverseEventDeletionNotAllowedException(String message) {
        super(message);
    }
}
