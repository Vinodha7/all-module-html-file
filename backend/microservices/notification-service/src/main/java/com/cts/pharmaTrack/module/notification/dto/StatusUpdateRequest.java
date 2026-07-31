package com.cts.pharmaTrack.module.notification.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * Inbound payload for updating a notification's status. The new status is carried
 * in the request body (e.g. {@code {"status": "Read"}}) rather than the URL.
 */
@Getter
@Setter
public class StatusUpdateRequest {

    @NotBlank(message = "status is required")
    private String status;
}
