package com.cts.pharmaTrack.module.identityAccessManagement.repository;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.RoleDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<RoleDetails, Integer> {
    Optional<RoleDetails> findByRoleName(String roleName);
    boolean existsByRoleName(String roleName);
}