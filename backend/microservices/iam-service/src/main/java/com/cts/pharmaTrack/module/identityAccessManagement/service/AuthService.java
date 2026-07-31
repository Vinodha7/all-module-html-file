package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.LoginRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.LogoutRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.ResetPasswordRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.LoginResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.UserResponse;

public interface AuthService {
    LoginResponse login(LoginRequest request, String ipAddress, String deviceInfo);
    LoginResponse refresh(String token);
    void logout(LogoutRequest request);
    UserResponse getCurrentUser(String token);
    ApiResponse<String> resetPassword(ResetPasswordRequest request);
}