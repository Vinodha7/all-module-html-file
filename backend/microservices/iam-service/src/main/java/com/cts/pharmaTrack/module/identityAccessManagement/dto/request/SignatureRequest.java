package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import lombok.Data;

/** Payload for applying an electronic signature to an audit-log entry. */
@Data
public class SignatureRequest {
    private Integer userId;
    /** Approved | Reviewed | Submitted | ... */
    private String meaning;
}
