package com.cts.pharmaTrack.module.identityAccessManagement.repository;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserDetails;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface UserSessionRepository extends JpaRepository<UserSession, Integer> {
    Optional<UserSession> findByUser_UserIdAndIsActiveTrue(Integer userId);
    List<UserSession> findByUser_UserId(Integer userId);
    List<UserSession> findByIsActiveTrue();
    Optional<UserSession> findByToken(String token);

    @Query("SELECT DISTINCT s.user FROM UserSession s")
    List<UserDetails> findUsersWhoLoggedIn();
}