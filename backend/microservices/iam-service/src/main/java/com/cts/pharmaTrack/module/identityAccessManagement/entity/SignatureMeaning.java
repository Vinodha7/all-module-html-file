package com.cts.pharmaTrack.module.identityAccessManagement.entity;

/**
 * Canonical business meanings a Wave 3 entity-based electronic signature may
 * carry (21 CFR Part 11 §11.50 "meaning associated with the signature").
 *
 * <p>Unlike the legacy free-text {@code meaning} on audit-log signatures, the
 * V2 approval-workflow signatures constrain the meaning to this closed set so
 * the value is verifiable and reportable. The enum {@code name()} is what gets
 * persisted (the entity's {@code meaning} column stays a {@code String} for
 * backward compatibility with legacy rows) and what feeds the signature hash.
 */
public enum SignatureMeaning {
    APPROVED,
    REVIEWED,
    REJECTED,
    RELEASED
}
