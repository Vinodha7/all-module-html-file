package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreateRoleRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.RoleResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.service.RoleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class RoleController {

    private static final Logger logger = LoggerFactory.getLogger(RoleController.class);

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @PostMapping("/createRole")
    public ResponseEntity<ApiResponse<Void>> createRole(
            @RequestBody CreateRoleRequest request) {
        roleService.createRole(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Role created successfully"));
    }

    @GetMapping("/fetchRoles")
    public ResponseEntity<ApiResponse<List<RoleResponse>>> fetchRoles() {
        return ResponseEntity.ok(
                ApiResponse.success("Roles fetched",
                        roleService.fetchAllRoles()));
    }

    
}