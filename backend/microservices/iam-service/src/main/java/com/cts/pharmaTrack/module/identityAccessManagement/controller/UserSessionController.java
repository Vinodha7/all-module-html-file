package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserSession;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.IamAuditLogRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class UserSessionController {

    private static final Logger logger = LoggerFactory.getLogger(UserSessionController.class);

    private final UserSessionRepository sessionRepository;
    private final IamAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public UserSessionController(UserSessionRepository sessionRepository,
                                 IamAuditLogRepository auditLogRepository,
                                 UserRepository userRepository) {
        this.sessionRepository = sessionRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/fetchSessionsByUser/{userId}")
    public ResponseEntity<ApiResponse<UserSession>> fetchSessionsByUser(
            @PathVariable Integer userId) {
        UserSession session = sessionRepository
                .findByUser_UserIdAndIsActiveTrue(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active session found for this user"));
        return ResponseEntity.ok(
                ApiResponse.success("Session fetched successfully", session));
    }

    @DeleteMapping("/forceLogout/{userId}")
    public ResponseEntity<ApiResponse<Void>> forceLogout(@PathVariable Integer userId) {
        List<UserSession> sessions = sessionRepository.findByUser_UserId(userId);
        boolean anyActive = sessions.stream().anyMatch(UserSession::getIsActive);
        if (!anyActive)
            throw new ResourceNotFoundException("No active session found for this user");

        sessions.forEach(s -> {
            s.setIsActive(false);
            sessionRepository.save(s);
        });

        UserDetails user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(AuditLog.AuditAction.ForceLogout);
        log.setEntityType("User");
        log.setRecordId(userId);
        log.setReason("Force logout by Admin");
        auditLogRepository.save(log);

        return ResponseEntity.status(HttpStatus.NO_CONTENT)
                .body(ApiResponse.success("Session deactivated successfully"));
    }
}