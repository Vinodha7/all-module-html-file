package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreateRoleRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.RoleResponse;
import java.util.List;

public interface RoleService {
    RoleResponse createRole(CreateRoleRequest request);
    List<RoleResponse> fetchAllRoles();
}