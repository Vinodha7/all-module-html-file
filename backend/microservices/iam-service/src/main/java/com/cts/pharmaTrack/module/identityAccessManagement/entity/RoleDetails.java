package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "role_details")
@Data
public class RoleDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer roleId;

    @Column(nullable = false, unique = true, length = 50)
    private String roleName;
}