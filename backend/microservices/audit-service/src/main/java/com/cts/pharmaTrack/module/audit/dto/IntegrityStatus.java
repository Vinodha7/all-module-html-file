package com.cts.pharmaTrack.module.audit.dto;

/**
 * Result of verifying a single stored audit event against its keyed HMAC.
 */
public enum IntegrityStatus {

    /** Recomputed hash matches the stored {@code rowHash}. */
    VERIFIED,

    /** Recomputed hash differs from the stored {@code rowHash}. */
    TAMPERED,

    /**
     * Cannot be verified: missing {@code rowHash}, missing required fields, or
     * persisted JSON that cannot be canonicalized.
     */
    UNVERIFIABLE
}
