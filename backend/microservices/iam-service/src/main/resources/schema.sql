-- PharmaTrack IAM schema (pharmatrack_iam_ms).
-- Exported from the working dev database so a fresh install self-provisions on
-- first run. Runs via spring.sql.init (mode=always) because iam-service uses
-- ddl-auto=none. CREATE ... IF NOT EXISTS keeps it safe to re-run every boot.
-- FOREIGN_KEY_CHECKS is disabled so the tables can be created in any order
-- despite inter-table foreign keys. Seed data (admin user + Auditor role) is
-- inserted at runtime by AdminBootstrap / AuditorRoleBootstrap (no data.sql).

SET FOREIGN_KEY_CHECKS = 0;
CREATE TABLE IF NOT EXISTS `audit_log` (
  `auditId` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `action` enum('Create','Update','Delete','Login','Logout','PasswordReset','ForceLogout','SessionDeactivated') NOT NULL,
  `entityType` varchar(100) DEFAULT NULL,
  `module` varchar(100) NOT NULL DEFAULT 'IAM',
  `recordId` int DEFAULT NULL,
  `reason` text,
  `oldValue` text,
  `newValue` text,
  `sessionId` int DEFAULT NULL,
  `ipAddress` varchar(50) DEFAULT NULL,
  `checksum` varchar(255) DEFAULT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`auditId`),
  KEY `fk_auditlog_user` (`userId`),
  KEY `fk_auditlog_session` (`sessionId`),
  CONSTRAINT `fk_auditlog_session` FOREIGN KEY (`sessionId`) REFERENCES `user_session` (`sessionId`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_auditlog_user` FOREIGN KEY (`userId`) REFERENCES `user_details` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `electronic_signature` (
  `signatureId` int NOT NULL AUTO_INCREMENT,
  `auditId` int DEFAULT NULL,
  `userId` int NOT NULL,
  `signedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `signatureHash` varchar(255) NOT NULL,
  `meaning` varchar(200) NOT NULL,
  `signerName` varchar(150) DEFAULT NULL,
  `entityType` varchar(100) DEFAULT NULL,
  `entityId` varchar(100) DEFAULT NULL,
  `entityVersion` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`signatureId`),
  KEY `fk_es_audit` (`auditId`),
  KEY `fk_es_user` (`userId`),
  KEY `idx_esig_entity` (`entityType`,`entityId`,`entityVersion`),
  CONSTRAINT `fk_es_audit` FOREIGN KEY (`auditId`) REFERENCES `audit_log` (`auditId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_es_user` FOREIGN KEY (`userId`) REFERENCES `user_details` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `permission` (
  `permissionId` int NOT NULL AUTO_INCREMENT,
  `roleId` int NOT NULL,
  `module` varchar(100) NOT NULL,
  `canCreate` tinyint(1) DEFAULT '0',
  `canRead` tinyint(1) DEFAULT '0',
  `canUpdate` tinyint(1) DEFAULT '0',
  `canDelete` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`permissionId`),
  KEY `fk_permission_role` (`roleId`),
  CONSTRAINT `fk_permission_role` FOREIGN KEY (`roleId`) REFERENCES `role_details` (`roleId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `role_details` (
  `roleId` int NOT NULL AUTO_INCREMENT,
  `roleName` varchar(50) NOT NULL,
  PRIMARY KEY (`roleId`),
  UNIQUE KEY `roleName` (`roleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `product` (
  `productId` int NOT NULL AUTO_INCREMENT,
  `productName` varchar(150) NOT NULL,
  `storageCondition` varchar(100) NOT NULL,
  `minThreshold` double NOT NULL,
  `maxThreshold` double NOT NULL,
  PRIMARY KEY (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `site` (
  `siteId` int NOT NULL AUTO_INCREMENT,
  `siteName` varchar(150) NOT NULL,
  `country` varchar(100) NOT NULL,
  PRIMARY KEY (`siteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `user_details` (
  `userId` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `roleId` int NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `siteId` int DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('Active','Inactive','Locked') DEFAULT 'Active',
  `failedAttempts` int DEFAULT '0',
  `lastFailedAttempt` datetime DEFAULT NULL,
  `resetToken` varchar(255) DEFAULT NULL,
  `resetTokenExpiry` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_user_role` (`roleId`),
  KEY `fk_user_site` (`siteId`),
  CONSTRAINT `fk_user_role` FOREIGN KEY (`roleId`) REFERENCES `role_details` (`roleId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_user_site` FOREIGN KEY (`siteId`) REFERENCES `site` (`siteId`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `user_session` (
  `sessionId` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `token` varchar(500) NOT NULL,
  `ipAddress` varchar(50) DEFAULT NULL,
  `deviceInfo` varchar(200) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` datetime NOT NULL,
  `isActive` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`sessionId`),
  KEY `fk_session_user` (`userId`),
  CONSTRAINT `fk_session_user` FOREIGN KEY (`userId`) REFERENCES `user_details` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

