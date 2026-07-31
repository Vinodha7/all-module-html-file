package com.cts.pharmaTrack.module.identityAccessManagement.serviceImpl;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreatePermissionRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.PermissionResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.DuplicateResourceException;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.Permission;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.RoleDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.PermissionRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.RoleRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.service.PermissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PermissionServiceImpl implements PermissionService {

    private static final Logger logger =
            LoggerFactory.getLogger(PermissionServiceImpl.class);

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;

    public PermissionServiceImpl(PermissionRepository permissionRepository,
                                 RoleRepository roleRepository) {
        this.permissionRepository = permissionRepository;
        this.roleRepository = roleRepository;
    }

    @Override
    public PermissionResponse createPermission(CreatePermissionRequest request) {
        logger.info("Creating permission for roleId: {} module: {}",
                request.getRoleId(), request.getModule());

        if (permissionRepository.existsByRole_RoleIdAndModule(
                request.getRoleId(), request.getModule())) {
            logger.warn("Permission creation failed â€” already exists " +
                    "for roleId: {} module: {}",
                    request.getRoleId(), request.getModule());
            throw new DuplicateResourceException(
                    "Permission already exists for this role and module");
        }

        RoleDetails role = roleRepository.findById(request.getRoleId())
                .orElseThrow(() -> {
                    logger.warn("Permission creation failed â€” " +
                            "role not found: {}", request.getRoleId());
                    return new ResourceNotFoundException("Role not found");
                });

        Permission permission = new Permission();
        permission.setRole(role);
        permission.setModule(request.getModule());
        permission.setCanCreate(Boolean.TRUE.equals(request.getCanCreate()));
        permission.setCanRead(Boolean.TRUE.equals(request.getCanRead()));
        permission.setCanUpdate(Boolean.TRUE.equals(request.getCanUpdate()));
        permission.setCanDelete(Boolean.TRUE.equals(request.getCanDelete()));
        permissionRepository.save(permission);

        logger.info("Permission created successfully for roleId: {} module: {}",
                request.getRoleId(), request.getModule());
        return mapToResponse(permission);
    }

    @Override
    public List<PermissionResponse> fetchPermissionsByRole(Integer roleId) {
        logger.info("Fetching permissions for roleId: {}", roleId);

        List<Permission> permissions =
                permissionRepository.findByRole_RoleId(roleId);
        if (permissions.isEmpty()) {
            logger.warn("No permissions found for roleId: {}", roleId);
            throw new ResourceNotFoundException(
                    "No permissions found for this role");
        }

        logger.info("Fetched {} permissions for roleId: {}",
                permissions.size(), roleId);
        return permissions.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private PermissionResponse mapToResponse(Permission p) {
        PermissionResponse res = new PermissionResponse();
        res.setPermissionId(p.getPermissionId());
        res.setRoleId(p.getRole().getRoleId());
        res.setModule(p.getModule());
        res.setCanCreate(p.getCanCreate());
        res.setCanRead(p.getCanRead());
        res.setCanUpdate(p.getCanUpdate());
        res.setCanDelete(p.getCanDelete());
        return res;
    }
}