package com.cts.pharmaTrack.module.subjectEnrolment.exception;

import com.cts.pharmaTrack.common.exception.BadRequestException;

/**
 * 400 - thrown when a subjectEnrolment request is missing mandatory fields
 * required by the business logic (for example a missing id on update).
 *
 * <p>Extends {@link BadRequestException} so the existing
 * {@code GlobalExceptionHandler} maps it to HTTP 400 without any change.
 */
public class InvalidEnrolmentRequestException extends BadRequestException {

    public InvalidEnrolmentRequestException(String message) {
        super(message);
    }
}
