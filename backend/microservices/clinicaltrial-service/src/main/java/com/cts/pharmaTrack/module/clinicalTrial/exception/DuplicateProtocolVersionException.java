package com.cts.pharmaTrack.module.clinicalTrial.exception;

public class DuplicateProtocolVersionException extends RuntimeException {

    public DuplicateProtocolVersionException(String versionNumber) {
        super("Protocol version already exists: " + versionNumber);
    }
}