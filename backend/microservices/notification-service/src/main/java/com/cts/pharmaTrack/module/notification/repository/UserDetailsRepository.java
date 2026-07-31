package com.cts.pharmaTrack.module.notification.repository;

import com.cts.pharmaTrack.module.notification.entity.UserDetails;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("notificationUserDetailsRepository")
public interface UserDetailsRepository extends JpaRepository<UserDetails, Integer> {
}
