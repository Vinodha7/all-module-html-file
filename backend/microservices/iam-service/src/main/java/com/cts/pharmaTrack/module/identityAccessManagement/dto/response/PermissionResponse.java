package com.cts.pharmaTrack.module.identityAccessManagement.dto.response;

import lombok.Data;

@Data
public class PermissionResponse {
    private Integer permissionId;
    private Integer roleId;
    private String module;
    private Boolean canCreate;
    private Boolean canRead;
    private Boolean canUpdate;
    private Boolean canDelete;
}