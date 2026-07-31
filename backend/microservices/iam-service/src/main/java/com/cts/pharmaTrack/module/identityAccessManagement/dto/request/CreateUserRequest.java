package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import lombok.Data;

@Data
public class CreateUserRequest {
    private String name;
    private Integer roleId;
    private String email;
    private String phone;
    private Integer siteId;
    private String password;
}