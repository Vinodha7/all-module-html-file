package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;

/**
 * 404 - thrown when an adverse event cannot be found in the subjectEnrolment module.
 *
 * <p>Extends {@link ResourceNotFoundException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 404 without any change.
 */
public class AdverseEventNotFoundException extends ResourceNotFoundException {

    public AdverseEventNotFoundException() {
        super("Event not found");
    }

    public AdverseEventNotFoundException(String message) {
        super(message);
    }

    public AdverseEventNotFoundException(Long aeId) {
        super("Event not found with id: " + aeId);
    }
}
