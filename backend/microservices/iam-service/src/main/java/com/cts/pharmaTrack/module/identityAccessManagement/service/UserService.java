package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreateUserRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.UpdateUserRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.UpdateUserStatusRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.UserResponse;
import java.util.List;

public interface UserService {
    UserResponse createUser(CreateUserRequest request);
    List<UserResponse> fetchAllUsers();
    UserResponse fetchUserById(Integer userId);
    UserResponse updateUser(Integer userId, UpdateUserRequest request);
    UserResponse updateUserStatus(Integer userId,
            UpdateUserStatusRequest request);
    void deactivateUser(Integer userId);
    UserResponse unlockUser(Integer userId,
            UpdateUserStatusRequest request);
    List<UserResponse> fetchLockedUsers();
    List<UserResponse> fetchUsersWhoLoggedIn();
}