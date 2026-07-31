package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.ResourceConflictException;

/**
 * 409 - thrown when a trial subject cannot be deleted because dependent visit
 * records or adverse events still reference it.
 *
 * <p>Extends {@link ResourceConflictException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 409 without any change.
 */
public class SubjectDeletionNotAllowedException extends ResourceConflictException {

    public SubjectDeletionNotAllowedException() {
        super("Subject cannot be deleted, child records exist");
    }

    public SubjectDeletionNotAllowedException(String message) {
        super(message);
    }
}
