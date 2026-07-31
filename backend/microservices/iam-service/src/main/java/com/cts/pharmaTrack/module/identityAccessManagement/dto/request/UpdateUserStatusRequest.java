package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import lombok.Data;

@Data
public class UpdateUserStatusRequest {
    private String status;
    private String reason;
}