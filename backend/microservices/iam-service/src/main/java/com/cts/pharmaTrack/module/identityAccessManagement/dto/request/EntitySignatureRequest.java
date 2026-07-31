package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.SignatureMeaning;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Payload for applying a Wave 3 entity-based electronic signature to a business
 * record in an approval workflow.
 *
 * <p>There is deliberately <strong>no {@code userId} field</strong>: the signer
 * identity is always taken from the authenticated JWT principal, never from the
 * request body (Wave 3 business rule 4).
 */
@Data
public class EntitySignatureRequest {

    /** Business entity type, e.g. {@code TrialProtocol}. */
    @NotBlank(message = "entityType is required")
    private String entityType;

    /** Business entity id. */
    @NotBlank(message = "entityId is required")
    private String entityId;

    /** Version of the entity being signed, e.g. {@code 2.0}. */
    @NotBlank(message = "entityVersion is required")
    private String entityVersion;

    /** Business meaning of the signature (APPROVED, REVIEWED, REJECTED, RELEASED). */
    @NotNull(message = "meaning is required (APPROVED, REVIEWED, REJECTED, RELEASED)")
    private SignatureMeaning meaning;
}
