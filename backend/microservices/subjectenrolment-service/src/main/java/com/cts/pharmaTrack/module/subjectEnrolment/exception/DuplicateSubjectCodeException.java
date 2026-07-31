package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.DuplicateResourceException;

/**
 * 409 - thrown when a trial subject is created or updated with a {@code subjectCode}
 * that already exists.
 *
 * <p>Extends {@link DuplicateResourceException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 409 without any change.
 */
public class DuplicateSubjectCodeException extends DuplicateResourceException {

    public DuplicateSubjectCodeException() {
        super("Subject code already exists");
    }

    public DuplicateSubjectCodeException(String message) {
        super(message);
    }
}
