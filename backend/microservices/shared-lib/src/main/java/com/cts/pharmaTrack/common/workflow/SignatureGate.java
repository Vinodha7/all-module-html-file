package com.cts.pharmaTrack.common.workflow;

/**
 * Resolves whether a valid electronic signature exists for a signature-gated
 * workflow transition (Wave 4). The signature store lives in the IAM service, so
 * the default implementation ({@code IamSignatureGate}) verifies remotely.
 *
 * <p>Implementations must <strong>fail closed</strong>: if the signature cannot
 * be confirmed (e.g. IAM unreachable), return {@code null} so the transition is
 * rejected rather than allowed unsigned.
 */
public interface SignatureGate {

    /**
     * @return the id of a valid signature matching the entity/version/meaning, or
     *         {@code null} if none exists (or verification could not be performed)
     */
    Integer resolveSignatureId(String entityType, String entityId, String entityVersion,
                               String requiredMeaning, String bearerToken);
}
