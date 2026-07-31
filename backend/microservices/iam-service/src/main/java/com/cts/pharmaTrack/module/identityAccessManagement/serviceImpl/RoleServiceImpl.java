package com.cts.pharmaTrack.module.identityAccessManagement.serviceImpl;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.request.CreateRoleRequest;
import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.RoleResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.DuplicateResourceException;
import com.cts.pharmaTrack.module.identityAccessManagement.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.RoleDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.RoleRepository;
import com.cts.pharmaTrack.module.identityAccessManagement.service.RoleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoleServiceImpl implements RoleService {

    private static final Logger logger =
            LoggerFactory.getLogger(RoleServiceImpl.class);

    private final RoleRepository roleRepository;

    public RoleServiceImpl(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    public RoleResponse createRole(CreateRoleRequest request) {
        logger.info("Creating role: {}", request.getRoleName());

        if (roleRepository.existsByRoleName(request.getRoleName())) {
            logger.warn("Role creation failed â€” role already exists: {}",
                    request.getRoleName());
            throw new DuplicateResourceException("Role already exists");
        }

        RoleDetails role = new RoleDetails();
        role.setRoleName(request.getRoleName());
        roleRepository.save(role);

        logger.info("Role created successfully: {}", request.getRoleName());
        return mapToResponse(role);
    }

    @Override
    public List<RoleResponse> fetchAllRoles() {
        logger.info("Fetching all roles");

        List<RoleDetails> roles = roleRepository.findAll();
        if (roles.isEmpty()) {
            logger.warn("No roles found");
            throw new ResourceNotFoundException("No roles found");
        }

        logger.info("Fetched {} roles", roles.size());
        return roles.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private RoleResponse mapToResponse(RoleDetails role) {
        RoleResponse res = new RoleResponse();
        res.setRoleId(role.getRoleId());
        res.setRoleName(role.getRoleName());
        return res;
    }
}