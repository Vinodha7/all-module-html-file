package com.cts.pharmaTrack.module.clinicalTrial.exception;

public class TrialNotFoundException extends RuntimeException {

    public TrialNotFoundException(int trialId) {
        super("Trial not found with ID: " + trialId);
    }
}