package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import lombok.Data;

@Data
public class ResetPasswordRequest {
    private String step;
    private String email;
    private String token;
    private String newPassword;
    private String confirmPassword;
}