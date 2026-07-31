package com.cts.pharmaTrack.module.identityAccessManagement.dto.response;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.ElectronicSignature;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Read view of a Wave 3 entity-based electronic signature returned to clients.
 * Mirrors the persisted signature without leaking the JPA entity.
 */
@Data
@AllArgsConstructor
public class SignatureResponse {

    private Integer signatureId;
    private Integer signerId;
    private String signerName;
    private String entityType;
    private String entityId;
    private String entityVersion;
    private String meaning;
    private LocalDateTime signedAt;
    private String signatureHash;

    public static SignatureResponse from(ElectronicSignature s) {
        return new SignatureResponse(
                s.getSignatureId(),
                s.getUserId(),
                s.getSignerName(),
                s.getEntityType(),
                s.getEntityId(),
                s.getEntityVersion(),
                s.getMeaning(),
                s.getSignedAt(),
                s.getSignatureHash());
    }
}
