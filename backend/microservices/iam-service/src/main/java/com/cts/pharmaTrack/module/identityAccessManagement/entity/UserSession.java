package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_session")
public class UserSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer sessionId;

    @ManyToOne
    @JoinColumn(name = "userId", nullable = false)
    private UserDetails user;

    @Column(nullable = false, length = 500)
    private String token;

    @Column(length = 50)
    private String ipAddress;

    @Column(length = 200)
    private String deviceInfo;

    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean isActive = true;

    // Getters
    public Integer getSessionId()       { return sessionId; }
    public UserDetails getUser()        { return user; }
    public String getToken()            { return token; }
    public String getIpAddress()        { return ipAddress; }
    public String getDeviceInfo()       { return deviceInfo; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public boolean getIsActive()        { return isActive; }

    // Setters
    public void setSessionId(Integer sessionId)         { this.sessionId = sessionId; }
    public void setUser(UserDetails user)               { this.user = user; }
    public void setToken(String token)                  { this.token = token; }
    public void setIpAddress(String ipAddress)          { this.ipAddress = ipAddress; }
    public void setDeviceInfo(String deviceInfo)        { this.deviceInfo = deviceInfo; }
    public void setCreatedAt(LocalDateTime createdAt)   { this.createdAt = createdAt; }
    public void setExpiresAt(LocalDateTime expiresAt)   { this.expiresAt = expiresAt; }
    public void setIsActive(boolean isActive)           { this.isActive = isActive; }
}