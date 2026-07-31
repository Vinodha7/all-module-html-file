package com.cts.pharmaTrack.module.clinicalTrial.exception;

public class ProtocolNotFoundException extends RuntimeException {

    public ProtocolNotFoundException(int protocolId) {
        super("Protocol not found with ID: " + protocolId);
    }
}