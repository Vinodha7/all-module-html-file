package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreatePermissionRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.PermissionResponse;
import java.util.List;

public interface PermissionService {
    PermissionResponse createPermission(CreatePermissionRequest request);
    List<PermissionResponse> fetchPermissionsByRole(Integer roleId);

}