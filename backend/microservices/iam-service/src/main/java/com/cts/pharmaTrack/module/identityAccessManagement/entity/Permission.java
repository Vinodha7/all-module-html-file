package com.cts.pharmaTrack.module.identityAccessManagement.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "permission")
@Data
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer permissionId;

    @ManyToOne
    @JoinColumn(name = "roleId", nullable = false)
    private RoleDetails role;

    @Column(nullable = false, length = 100)
    private String module;

    @Column(nullable = false)
    private Boolean canCreate = false;

    @Column(nullable = false)
    private Boolean canRead = false;

    @Column(nullable = false)
    private Boolean canUpdate = false;

    @Column(nullable = false)
    private Boolean canDelete = false;
}