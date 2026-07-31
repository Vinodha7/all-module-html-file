package com.cts.pharmaTrack.module.identityAccessManagement.service;

import com.cts.pharmaTrack.module.identityAccessManagement.repository.IamAuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * 21 CFR Part 11 retention policy: audit logs must be retained for a MINIMUM
 * of 7 years. Audit records are never deleted by the application, so this
 * scheduled job is a non-destructive guardian — it reports retention coverage
 * daily so operators can confirm the minimum-retention requirement is met and
 * are alerted if any records approach/exceed the boundary for archival.
 */
@Service
public class RetentionPolicyService {

    private static final Logger log = LoggerFactory.getLogger(RetentionPolicyService.class);
    private static final int RETENTION_YEARS = 7;

    private final IamAuditLogRepository auditLogRepository;

    public RetentionPolicyService(IamAuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    /** Runs daily at 02:00. Never deletes — only reports retention status. */
    @Scheduled(cron = "0 0 2 * * *")
    public void enforceRetention() {
        LocalDateTime cutoff = LocalDateTime.now().minusYears(RETENTION_YEARS);
        long total = auditLogRepository.count();
        long withinRetention = auditLogRepository.countByTimestampAfter(cutoff);
        long beyondRetention = total - withinRetention;
        log.info("[Retention] {}-year policy: total={}, withinRetention={}, beyondRetention(eligible for archival, NOT deleted)={}",
                RETENTION_YEARS, total, withinRetention, beyondRetention);
    }
}
