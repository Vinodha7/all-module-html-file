package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.LoginRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.LogoutRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.ResetPasswordRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.LoginResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.UserResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/pharmaTrack/identityAccess/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // Login â€” returns token in data
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        String ipAddress  = httpRequest.getRemoteAddr();
        String deviceInfo = httpRequest.getHeader("User-Agent");
        LoginResponse data = authService.login(request, ipAddress, deviceInfo);
        return ResponseEntity.ok(ApiResponse.success("Login successful", data));
    }

    // Refresh â€” sliding session: re-issue a token from the current valid one
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            HttpServletRequest httpRequest) {
        String token = httpRequest.getHeader("Authorization").substring(7);
        LoginResponse data = authService.refresh(token);
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", data));
    }

    // Logout â€” no data in response
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestBody LogoutRequest request) {
        authService.logout(request);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    // Get current user
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            HttpServletRequest httpRequest) {
        String token = httpRequest.getHeader("Authorization").substring(7);
        return ResponseEntity.ok(
                ApiResponse.success("User fetched",
                        authService.getCurrentUser(token)));
    }

    // Reset Password â€” Step 1 REQUEST
    @PostMapping("/resetPassword")
    public ResponseEntity<ApiResponse<String>> requestPasswordReset(
            @RequestBody ResetPasswordRequest request) {
        request.setStep("REQUEST");
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    // Reset Password â€” Step 2 VERIFY
    @GetMapping("/verifyToken/{token}")
    public ResponseEntity<ApiResponse<String>> verifyResetToken(
            @PathVariable String token) {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setStep("VERIFY");
        request.setToken(token);
        return ResponseEntity.ok(authService.resetPassword(request));
    }

    // Reset Password â€” Step 3 RESET
    @PutMapping("/resetPassword")
    public ResponseEntity<ApiResponse<String>> resetPassword(
            @RequestBody ResetPasswordRequest request) {
        request.setStep("RESET");
        return ResponseEntity.ok(authService.resetPassword(request));
    }
}