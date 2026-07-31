package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import lombok.Data;

@Data
public class LogoutRequest {
    private String token;
}