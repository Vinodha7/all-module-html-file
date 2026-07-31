package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String name;
    private Integer roleId;
    private String phone;
    private Integer siteId;
}