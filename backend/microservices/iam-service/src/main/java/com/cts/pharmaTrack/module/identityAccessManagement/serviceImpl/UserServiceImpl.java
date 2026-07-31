package com.cts.pharmaTrack.module.identityAccessManagement.serviceImpl;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreateUserRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.UpdateUserRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.UpdateUserStatusRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.UserResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.DuplicateResourceException;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.RoleDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails.UserStatus;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.Site;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.IamAuditLogRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.RoleRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.UserSessionRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.SiteRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.ProductRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserServiceImpl implements UserService {

    private static final Logger logger =
            LoggerFactory.getLogger(UserServiceImpl.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final IamAuditLogRepository auditLogRepository;
    private final UserSessionRepository userSessionRepository;
    private final SiteRepository siteRepository;
    private final ProductRepository productRepository;

    public UserServiceImpl(UserRepository userRepository,
                           RoleRepository roleRepository,
                           PasswordEncoder passwordEncoder,
                           IamAuditLogRepository auditLogRepository,
                           UserSessionRepository userSessionRepository,
                           SiteRepository siteRepository,
                           ProductRepository productRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogRepository = auditLogRepository;
        this.userSessionRepository = userSessionRepository;
        this.siteRepository = siteRepository;
        this.productRepository = productRepository;
    }

    @Override
    public UserResponse createUser(CreateUserRequest request) {
        logger.info("Creating user with email: {}", request.getEmail());

        if (productRepository.count() == 0 || siteRepository.count() == 0) {
            throw new IllegalArgumentException("Admin must create products and sites first before creating users");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            logger.warn("User creation failed — email already exists: {}",
                    request.getEmail());
            throw new DuplicateResourceException("Email already exists");
        }

        RoleDetails role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> {
                    logger.warn("User creation failed — role not found: {}",
                            request.getRoleId());
                    return new ResourceNotFoundException("Role not found");
                });

        Site site = null;
        if (request.getSiteId() != null) {
            site = siteRepository.findById(request.getSiteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Site not found with ID: " + request.getSiteId()));
        }

        UserDetails user = new UserDetails();
        user.setName(request.getName());
        user.setRole(role);
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setSite(site);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setStatus(UserStatus.Active);
        userRepository.save(user);

        logger.info("User created successfully â€” name: {}, role: {}",
                user.getName(), role.getRoleName());

        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(AuditLog.AuditAction.Create);
        log.setEntityType("User");
        log.setRecordId(user.getUserId());
        log.setReason("New " + role.getRoleName() + " onboarded");
        auditLogRepository.save(log);

        return mapToResponse(user);
    }

    @Override
    public List<UserResponse> fetchAllUsers() {
        logger.info("Fetching all users");

        List<UserDetails> users = userRepository.findAll();
        if (users.isEmpty()) {
            logger.warn("No users found");
            throw new ResourceNotFoundException("No users found");
        }

        logger.info("Fetched {} users", users.size());
        return users.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponse fetchUserById(Integer userId) {
        logger.info("Fetching user by ID: {}", userId);

        UserDetails user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.warn("User not found for ID: {}", userId);
                    return new ResourceNotFoundException("User not found");
                });

        logger.info("User fetched successfully for ID: {}", userId);
        return mapToResponse(user);
    }

    @Override
    public UserResponse updateUser(Integer userId, UpdateUserRequest request) {
        logger.info("Updating user ID: {}", userId);

        UserDetails user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.warn("Update failed â€” user not found for ID: {}",
                            userId);
                    return new ResourceNotFoundException("User not found");
                });

        if (request.getRoleId() != null) {
            RoleDetails role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> {
                        logger.warn("Update failed â€” role not found: {}",
                                request.getRoleId());
                        return new ResourceNotFoundException("Role not found");
                    });
            user.setRole(role);
        }
        if (request.getName()   != null) user.setName(request.getName());
        if (request.getPhone()  != null) user.setPhone(request.getPhone());
        if (request.getSiteId() != null) {
            Site site = siteRepository.findById(request.getSiteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Site not found with ID: " + request.getSiteId()));
            user.setSite(site);
        }

        userRepository.save(user);

        logger.info("User updated successfully for ID: {}", userId);

        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(AuditLog.AuditAction.Update);
        log.setEntityType("User");
        log.setRecordId(user.getUserId());
        log.setReason("User details updated for " + user.getName());
        auditLogRepository.save(log);

        return mapToResponse(user);
    }

    @Override
    public UserResponse updateUserStatus(Integer userId,
            UpdateUserStatusRequest request) {
        logger.info("Updating status for user ID: {} to {}",
                userId, request.getStatus());

        UserDetails user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.warn("Status update failed â€” " +
                            "user not found for ID: {}", userId);
                    return new ResourceNotFoundException("User not found");
                });

        UserStatus newStatus;
        try {
            newStatus = UserStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid status value: {}", request.getStatus());
            throw new IllegalArgumentException(
                    "Invalid status: " + request.getStatus());
        }

        UserStatus current = user.getStatus();
        boolean valid =
                (current == UserStatus.Active &&
                        newStatus == UserStatus.Inactive) ||
                (current == UserStatus.Inactive &&
                        newStatus == UserStatus.Active) ||
                (current == UserStatus.Locked &&
                        newStatus == UserStatus.Active);

        if (!valid) {
            logger.warn("Invalid status transition from {} to {} " +
                    "for user ID: {}", current, newStatus, userId);
            throw new DuplicateResourceException(
                    "Status transition not allowed");
        }

        user.setStatus(newStatus);
        userRepository.save(user);

        logger.info("Status updated to {} for user ID: {}",
                newStatus, userId);

        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(AuditLog.AuditAction.Update);
        log.setEntityType("User");
        log.setRecordId(user.getUserId());
        log.setReason("User status updated to " + newStatus
                + " â€” " + request.getReason());
        auditLogRepository.save(log);

        return mapToResponse(user);
    }

    @Override
    public void deactivateUser(Integer userId) {
        logger.info("Deactivating user ID: {}", userId);

        UserDetails user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.warn("Deactivate failed â€” " +
                            "user not found for ID: {}", userId);
                    return new ResourceNotFoundException("User not found");
                });

        if (user.getStatus() == UserStatus.Inactive) {
            logger.warn("User ID: {} is already inactive", userId);
            throw new IllegalArgumentException("User is already inactive");
        }

        user.setStatus(UserStatus.Inactive);
        userRepository.save(user);

        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(AuditLog.AuditAction.Update);
        log.setEntityType("User");
        log.setRecordId(userId);
        log.setReason("User account deactivated for " + user.getName());
        auditLogRepository.save(log);

        logger.info("User deactivated successfully for ID: {}", userId);
    }

    @Override
    public UserResponse unlockUser(Integer userId,
            UpdateUserStatusRequest request) {
        logger.info("Unlocking user ID: {}", userId);

        UserDetails user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    logger.warn("Unlock failed â€” user not found for ID: {}",
                            userId);
                    return new ResourceNotFoundException("User not found");
                });

        if (user.getStatus() != UserStatus.Locked) {
            logger.warn("Unlock failed â€” user ID: {} is not locked", userId);
            throw new IllegalArgumentException("User is not locked");
        }

        user.setStatus(UserStatus.Active);
        user.setFailedAttempts(0);
        user.setLastFailedAttempt(null);
        userRepository.save(user);

        logger.info("User unlocked successfully for ID: {}", userId);

        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setAction(AuditLog.AuditAction.Update);
        log.setEntityType("User");
        log.setRecordId(user.getUserId());
        log.setReason("Account unlocked for " + user.getName()
                + " â€” " + request.getReason());
        auditLogRepository.save(log);

        return mapToResponse(user);
    }

    @Override
    public List<UserResponse> fetchLockedUsers() {
        logger.info("Fetching locked users");

        List<UserDetails> locked =
                userRepository.findByStatus(UserStatus.Locked);
        if (locked.isEmpty()) {
            logger.warn("No locked accounts found");
            throw new ResourceNotFoundException("No locked accounts found");
        }

        logger.info("Found {} locked users", locked.size());
        return locked.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<UserResponse> fetchUsersWhoLoggedIn() {
        logger.info("Fetching users who have logged in");

        List<UserDetails> users =
                userSessionRepository.findUsersWhoLoggedIn();
        if (users.isEmpty()) {
            logger.warn("No users have logged in yet");
            throw new ResourceNotFoundException(
                    "No users have logged in yet");
        }

        logger.info("Found {} users who have logged in", users.size());
        return users.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private UserResponse mapToResponse(UserDetails user) {
        UserResponse res = new UserResponse();
        res.setUserId(user.getUserId());
        res.setName(user.getName());
        res.setRole(user.getRole().getRoleName());
        res.setEmail(user.getEmail());
        res.setPhone(user.getPhone());
        res.setSiteId(user.getSite() != null ? user.getSite().getSiteId() : null);
        res.setStatus(user.getStatus().name());
        return res;
    }
}