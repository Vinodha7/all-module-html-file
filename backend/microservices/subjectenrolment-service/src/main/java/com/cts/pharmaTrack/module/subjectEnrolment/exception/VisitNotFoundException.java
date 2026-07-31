package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;

/**
 * 404 - thrown when a visit record cannot be found in the subjectEnrolment module.
 *
 * <p>Extends {@link ResourceNotFoundException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 404 without any change.
 */
public class VisitNotFoundException extends ResourceNotFoundException {

    public VisitNotFoundException() {
        super("Visit not found");
    }

    public VisitNotFoundException(String message) {
        super(message);
    }

    public VisitNotFoundException(Long visitId) {
        super("Visit not found with id: " + visitId);
    }
}
