package com.cts.pharmaTrack.module.clinicalTrial.exception;

public class DuplicateTrialCodeException extends RuntimeException {

    public DuplicateTrialCodeException(String trialCode) {
        super("Trial code already exists: " + trialCode);
    }
}