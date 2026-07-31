package com.cts.pharmaTrack.module.identityAccessManagement.repository;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<UserDetails, Integer> {
    Optional<UserDetails> findByEmail(String email);
    boolean existsByEmail(String email);
    List<UserDetails> findByStatus(UserStatus status);
    List<UserDetails> findByRole_RoleId(Integer roleId);
    Optional<UserDetails> findByResetToken(String resetToken);
}