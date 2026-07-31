package com.cts.pharmaTrack.module.identityAccessManagement.dto.request;

import lombok.Data;

@Data
public class CreatePermissionRequest {
    private Integer roleId;
    private String module;
    private Boolean canCreate;
    private Boolean canRead;
    private Boolean canUpdate;
    private Boolean canDelete;
}