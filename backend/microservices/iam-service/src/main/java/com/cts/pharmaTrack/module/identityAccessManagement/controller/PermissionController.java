package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreatePermissionRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.PermissionResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.service.PermissionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class PermissionController {

    private static final Logger logger = LoggerFactory.getLogger(PermissionController.class);

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @PostMapping("/createPermission")
    public ResponseEntity<ApiResponse<Void>> createPermission(
            @RequestBody CreatePermissionRequest request) {
        permissionService.createPermission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Permission created successfully"));
    }

    @GetMapping("/fetchPermissionsByRole/{roleId}")
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> fetchPermissions(
            @PathVariable Integer roleId) {
        return ResponseEntity.ok(
                ApiResponse.success("Permissions fetched",
                        permissionService.fetchPermissionsByRole(roleId)));
    }

    
}