package com.cts.pharmaTrack.module.identityAccessManagement.serviceImpl;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.LoginRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.LogoutRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.ResetPasswordRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.LoginResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.UserResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails.UserStatus;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserSession;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.IamAuditLogRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserSessionRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.security.JwtUtil;
import com.cts.pharmaTrack.module.identityAccessManagement.service.AuthService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final UserSessionRepository sessionRepository;
    private final IamAuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthServiceImpl(UserRepository userRepository,
                           UserSessionRepository sessionRepository,
                           IamAuditLogRepository auditLogRepository,
                           PasswordEncoder passwordEncoder,
                           JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.auditLogRepository = auditLogRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @Value("${jwt.expiration}")
    private long expirationMs;

    /**
     * Dev-only: when true, the password-reset REQUEST step returns the generated
     * token in the response so the flow is testable without an email server.
     * Defaults to false; enabled only under the 'dev' profile. Never enable in prod.
     */
    @Value("${app.security.expose-reset-token:false}")
    private boolean exposeResetToken;

    private static final int MAX_FAILED_ATTEMPTS = 5;

    @Override
    public LoginResponse login(LoginRequest request, String ipAddress, String deviceInfo) {

        UserDetails user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid email or password"));

        if (user.getStatus() == UserStatus.Locked)
            throw new IllegalStateException("Account is locked");

        if (user.getStatus() == UserStatus.Deactivated)
            throw new IllegalStateException("Account is deactivated. Contact an administrator.");

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            user.setLastFailedAttempt(LocalDateTime.now());
            if (user.getFailedAttempts() >= MAX_FAILED_ATTEMPTS)
                user.setStatus(UserStatus.Locked);
            userRepository.save(user);
            throw new ResourceNotFoundException("Invalid email or password");
        }

        // Reset failed attempts and re-activate a signed-out (Inactive) account on successful login
        user.setFailedAttempts(0);
        user.setLastFailedAttempt(null);
        if (user.getStatus() == UserStatus.Inactive) {
            user.setStatus(UserStatus.Active);
        }
        userRepository.save(user);

        // Deactivate existing sessions â€” one session per user
        List<UserSession> activeSessions = sessionRepository
                .findByUser_UserId(user.getUserId())
                .stream().filter(s -> s.getIsActive()).toList();
        activeSessions.forEach(s -> {
            s.setIsActive(false);
            sessionRepository.save(s);
            writeAuditLog(user, AuditLog.AuditAction.SessionDeactivated,
                    "User", s.getSessionId(),
                    "Previous session deactivated â€” new login from " + ipAddress,
                    ipAddress);
        });

        // Generate JWT
        String token = jwtUtil.generateToken(
                user.getUserId(),
                user.getRole().getRoleId(),
                user.getRole().getRoleName(),
                user.getSiteId(),
                user.getEmail(),
                user.getName()
        );

        // Create new session
        UserSession session = new UserSession();
        session.setUser(user);
        session.setToken(token);
        session.setIpAddress(ipAddress);
        session.setDeviceInfo(deviceInfo);
        session.setExpiresAt(LocalDateTime.now().plusSeconds(expirationMs / 1000));
        session.setIsActive(true);
        sessionRepository.save(session);

        // Audit log â€” Login
        writeAuditLog(user, AuditLog.AuditAction.Login,
                "User", user.getUserId(),
                "User logged in from " + ipAddress,
                ipAddress);

        LoginResponse response = new LoginResponse();
        response.setToken(token);
        response.setExpiresIn(1800);
        response.setUserId(user.getUserId());
        response.setRole(user.getRole().getRoleName());
        return response;
    }

    @Override
    public LoginResponse refresh(String token) {
        // Sliding session: the caller presents a still-valid token (the JwtFilter
        // already rejected expired/inactive ones). Re-issue a fresh token and
        // roll the active session forward so logout/force-logout still work.
        UserSession session = sessionRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid token"));
        if (!session.getIsActive())
            throw new IllegalStateException("Session is no longer active");

        UserDetails user = session.getUser();
        String newToken = jwtUtil.generateToken(
                user.getUserId(),
                user.getRole().getRoleId(),
                user.getRole().getRoleName(),
                user.getSiteId(),
                user.getEmail(),
                user.getName());

        session.setToken(newToken);
        session.setExpiresAt(LocalDateTime.now().plusSeconds(expirationMs / 1000));
        sessionRepository.save(session);

        LoginResponse response = new LoginResponse();
        response.setToken(newToken);
        response.setExpiresIn((int) (expirationMs / 1000));
        response.setUserId(user.getUserId());
        response.setRole(user.getRole().getRoleName());
        return response;
    }

    @Override
    public void logout(LogoutRequest request) {
        UserSession session = sessionRepository.findByToken(request.getToken())
                .orElseThrow(() -> new ResourceNotFoundException("Invalid token"));
        session.setIsActive(false);
        sessionRepository.save(session);

        // Auto-mark the account Inactive on sign-out (distinct from admin-set Deactivated).
        // Only flip an Active account so a Deactivated/Locked account is never overridden.
        UserDetails user = session.getUser();
        if (user.getStatus() == UserStatus.Active) {
            user.setStatus(UserStatus.Inactive);
            userRepository.save(user);
        }

        // Audit log â€” Logout
        writeAuditLog(session.getUser(), AuditLog.AuditAction.Logout,
                "User", session.getUser().getUserId(),
                "User logged out",
                null);
    }

    @Override
    public UserResponse getCurrentUser(String token) {
        String email = jwtUtil.getEmail(token);
        UserDetails user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserResponse res = new UserResponse();
        res.setUserId(user.getUserId());
        res.setName(user.getName());
        res.setRole(user.getRole().getRoleName());
        res.setEmail(user.getEmail());
        res.setSiteId(user.getSiteId());
        res.setStatus(user.getStatus().name());
        return res;
    }

    @Override
    public ApiResponse<String> resetPassword(ResetPasswordRequest request) {
        return switch (request.getStep()) {

            case "REQUEST" -> {
                UserDetails user = userRepository.findByEmail(request.getEmail())
                        .orElseThrow(() -> new ResourceNotFoundException("Email not found"));
                String resetToken = UUID.randomUUID().toString();
                user.setResetToken(resetToken);
                user.setResetTokenExpiry(LocalDateTime.now().plusMinutes(15));
                userRepository.save(user);
                System.out.println("Reset token for "
                        + user.getEmail() + ": " + resetToken);
                if (exposeResetToken) {
                    // Dev/local (no email server): carry the token in BOTH data and a
                    // machine-parseable message marker so the UI can drive the reset
                    // in-app. The frontend parses "RESET_TOKEN::<token>" and never shows
                    // it raw. Never enable in prod.
                    yield ApiResponse.success("RESET_TOKEN::" + resetToken, resetToken);
                }
                yield ApiResponse.success("Reset link sent to email");
            }

            case "VERIFY" -> {
                UserDetails user = userRepository.findByResetToken(request.getToken())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Invalid or expired token"));
                if (user.getResetTokenExpiry().isBefore(LocalDateTime.now()))
                    throw new IllegalArgumentException("Reset token has expired");
                yield ApiResponse.success("Token is valid");
            }

            case "RESET" -> {
                if (!request.getNewPassword().equals(request.getConfirmPassword()))
                    throw new IllegalArgumentException("Passwords do not match");

                UserDetails user = userRepository.findByResetToken(request.getToken())
                        .orElseThrow(() -> new IllegalArgumentException(
                                "Invalid or expired token"));
                if (user.getResetTokenExpiry().isBefore(LocalDateTime.now()))
                    throw new IllegalArgumentException("Reset token has expired");

                user.setPassword(passwordEncoder.encode(request.getNewPassword()));
                user.setResetToken(null);
                user.setResetTokenExpiry(null);
                userRepository.save(user);

                // Audit log â€” Password Reset
                writeAuditLog(user, AuditLog.AuditAction.PasswordReset,
                        "User", user.getUserId(),
                        "Password reset successfully for " + user.getName(),
                        null);
                yield ApiResponse.success("Password reset successfully");
            }

            default -> throw new IllegalArgumentException(
                    "Invalid step. Use REQUEST, VERIFY, or RESET");
        };
    }

    private void writeAuditLog(UserDetails user, AuditLog.AuditAction action,
                                String entityType, Integer recordId,
                                String reason, String ipAddress) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setRecordId(recordId);
        log.setReason(reason);
        log.setIpAddress(ipAddress);
        auditLogRepository.save(log);
    }
}