package com.cts.pharmaTrack.module.clinicalTrial.exception;

public class SiteNotFoundException extends RuntimeException {

    public SiteNotFoundException(int siteId) {
        super("Site not found with ID: " + siteId);
    }
}