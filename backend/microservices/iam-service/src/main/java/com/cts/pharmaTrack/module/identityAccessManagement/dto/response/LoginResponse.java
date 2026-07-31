package com.cts.pharmaTrack.module.identityAccessManagement.dto.response;

import lombok.Data;

@Data
public class LoginResponse {
    private String token;
    private Integer expiresIn;
    private Integer userId;
    private String role;
}