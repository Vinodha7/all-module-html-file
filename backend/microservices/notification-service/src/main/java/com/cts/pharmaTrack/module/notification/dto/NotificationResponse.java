package com.cts.pharmaTrack.module.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Outbound representation of a notification.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {

    private Long notificationId;
    private String userId;
    private String message;
    private String category;
    private String status;
    private LocalDateTime createdDate;
}
