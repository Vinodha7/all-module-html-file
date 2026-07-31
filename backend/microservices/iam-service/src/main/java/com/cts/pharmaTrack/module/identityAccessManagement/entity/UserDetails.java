package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_details")
@Data
public class UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer userId;

    @Column(nullable = false, length = 100)
    private String name;

    @ManyToOne
    @JoinColumn(name = "roleId", nullable = false)
    private RoleDetails role;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 20)
    private String phone;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "siteId")
    private Site site;

    @Column(nullable = false, length = 255)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.Active;

    @Column(nullable = false)
    private Integer failedAttempts = 0;

    private LocalDateTime lastFailedAttempt;

    @Column(length = 255)
    private String resetToken;

    private LocalDateTime resetTokenExpiry;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Integer getSiteId() {
        return this.site != null ? this.site.getSiteId() : null;
    }

    public void setSiteId(Integer siteId) {
        if (siteId == null) {
            this.site = null;
        } else {
            Site s = new Site();
            s.setSiteId(siteId);
            this.site = s;
        }
    }

    public enum UserStatus {
        Active, Inactive, Locked
    }
}
