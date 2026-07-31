package com.cts.pharmaTrack.module.notification.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "user_details", schema = "pharmatrack_iam_ms")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDetails {

    @Id
    @Column(name = "userId")
    private Integer userId;

    @Column(name = "name")
    private String name;

    @Column(name = "email")
    private String email;
}
