package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreateUserRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.UpdateUserRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.UpdateUserStatusRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.UserResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class UserController {

    private static final Logger logger = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/createUser")
    public ResponseEntity<ApiResponse<Void>> createUser(
            @RequestBody CreateUserRequest request) {
        logger.info("POST /createUser request received with name: {}", request.getName());
        userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully"));
    }

    @GetMapping("/fetchUsers")
    public ResponseEntity<ApiResponse<List<UserResponse>>> fetchUsers() {
        logger.info("GET /fetchUsers request received");
        return ResponseEntity.ok(
                ApiResponse.success("Users fetched",
                        userService.fetchAllUsers()));
    }

    @GetMapping("/fetchUserById/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> fetchUserById(
            @PathVariable Integer userId) {
        logger.info("GET /fetchUserById/{} request received with userId: {}", userId, userId);
        return ResponseEntity.ok(
                ApiResponse.success("User fetched",
                        userService.fetchUserById(userId)));
    }

    @PutMapping("/updateUser/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Integer userId,
            @RequestBody UpdateUserRequest request) {
        logger.info("PUT /updateUser/{} request received with userId: {}", userId, userId);
        return ResponseEntity.ok(
                ApiResponse.success("User updated successfully",
                        userService.updateUser(userId, request)));
    }

    @PutMapping("/updateUserStatus/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable Integer userId,
            @RequestBody UpdateUserStatusRequest request) {
        logger.info("PUT /updateUserStatus/{} request received with userId: {}", userId, userId);
        return ResponseEntity.ok(
                ApiResponse.success("Status updated successfully",
                        userService.updateUserStatus(userId, request)));
    }

    @PutMapping("/deactivateUser/{userId}")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(
            @PathVariable Integer userId) {
        logger.info("PUT /deactivateUser/{} request received with userId: {}", userId, userId);
        userService.deactivateUser(userId);
        return ResponseEntity.ok(
                ApiResponse.success("User deactivated successfully"));
    }

    @PutMapping("/unlockUser/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> unlockUser(
            @PathVariable Integer userId,
            @RequestBody UpdateUserStatusRequest request) {
        logger.info("PUT /unlockUser/{} request received with userId: {}", userId, userId);
        return ResponseEntity.ok(
                ApiResponse.success("Account unlocked successfully",
                        userService.unlockUser(userId, request)));
    }

    @GetMapping("/fetchLockedUsers")
    public ResponseEntity<ApiResponse<List<UserResponse>>> fetchLockedUsers() {
        logger.info("GET /fetchLockedUsers request received");
        return ResponseEntity.ok(
                ApiResponse.success("Locked users fetched",
                        userService.fetchLockedUsers()));
    }

    @GetMapping("/fetchLoggedInUsers")
    public ResponseEntity<ApiResponse<List<UserResponse>>> fetchLoggedInUsers() {
        logger.info("GET /fetchLoggedInUsers request received");
        return ResponseEntity.ok(
                ApiResponse.success("Logged in users fetched",
                        userService.fetchUsersWhoLoggedIn()));
    }
}