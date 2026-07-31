package com.cts.pharmaTrack.module.identityAccessManagement.repository;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.Permission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, Integer> {
    List<Permission> findByRole_RoleId(Integer roleId);
    boolean existsByRole_RoleIdAndModule(Integer roleId, String module);
    Optional<Permission> findByRole_RoleIdAndModule(Integer roleId, String module);
}