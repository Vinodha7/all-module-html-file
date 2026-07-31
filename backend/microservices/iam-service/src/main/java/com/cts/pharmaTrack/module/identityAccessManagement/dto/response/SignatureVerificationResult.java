package com.cts.pharmaTrack.module.identityAccessManagement.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Per-signature outcome of a Wave 3 signature verification. Proves <em>who</em>
 * signed, <em>what</em> and <em>which version</em> was signed, and whether the
 * stored signature record was tampered with ({@code valid == false} when the
 * recomputed hash no longer matches the stored one).
 */
@Data
@AllArgsConstructor
public class SignatureVerificationResult {

    private Integer signatureId;
    private Integer signerId;
    private String signerName;
    private String entityType;
    private String entityId;
    private String entityVersion;
    private String meaning;
    private LocalDateTime signedAt;
    private boolean valid;
    private String storedHash;
    private String recomputedHash;
}
