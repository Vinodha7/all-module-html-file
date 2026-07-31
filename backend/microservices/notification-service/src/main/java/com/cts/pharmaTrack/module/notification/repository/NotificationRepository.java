package com.cts.pharmaTrack.module.notification.repository;

import com.cts.pharmaTrack.module.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserUserId(Integer userId);

    List<Notification> findByUserUserIdAndStatus(Integer userId, String status);

    List<Notification> findByCategory(String category);

    List<Notification> findByUserUserIdAndCategory(Integer userId, String category);

    long countByUserUserIdAndStatus(Integer userId, String status);
}
