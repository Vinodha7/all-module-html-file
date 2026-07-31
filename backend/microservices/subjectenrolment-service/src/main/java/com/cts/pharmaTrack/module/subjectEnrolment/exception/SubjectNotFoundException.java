package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;

/**
 * 404 - thrown when a trial subject cannot be found in the subjectEnrolment module.
 *
 * <p>Extends {@link ResourceNotFoundException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 404 without any change.
 */
public class SubjectNotFoundException extends ResourceNotFoundException {

    public SubjectNotFoundException() {
        super("Subject not found");
    }

    public SubjectNotFoundException(String message) {
        super(message);
    }

    public SubjectNotFoundException(Long subjectId) {
        super("Subject not found with id: " + subjectId);
    }
}
