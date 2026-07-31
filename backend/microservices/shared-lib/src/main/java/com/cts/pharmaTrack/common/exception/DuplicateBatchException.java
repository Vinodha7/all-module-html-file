package com.cts.pharmaTrack.common.exception;

/**
 * 409 - thrown when a batch_number already exists.
 */
public class DuplicateBatchException extends RuntimeException {

    public DuplicateBatchException(String message) {
        super(message);
    }
}
