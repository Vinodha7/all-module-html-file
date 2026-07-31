package com.cts.pharmaTrack.module.identityAccessManagement.repository;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.AuditLog.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface IamAuditLogRepository extends JpaRepository<AuditLog, Integer> {

    List<AuditLog> findByUser_UserId(Integer userId);
    List<AuditLog> findByAction(AuditAction action);
    List<AuditLog> findByModule(String module);

    /** Combined, optional-parameter filter with pagination (endpoint 3). */
        @Query("SELECT a FROM IamAuditLog a WHERE "
            + "(:module IS NULL OR a.module = :module) AND "
            + "(:action IS NULL OR a.action = :action) AND "
            + "(:userId IS NULL OR a.user.userId = :userId) AND "
            + "(:fromDate IS NULL OR a.timestamp >= :fromDate) AND "
            + "(:toDate IS NULL OR a.timestamp <= :toDate)")
    Page<AuditLog> filter(@Param("module") String module,
                          @Param("action") AuditAction action,
                          @Param("userId") Integer userId,
                          @Param("fromDate") LocalDateTime fromDate,
                          @Param("toDate") LocalDateTime toDate,
                          Pageable pageable);

    /** Same filter without paging — used by export endpoints. */
        @Query("SELECT a FROM IamAuditLog a WHERE "
            + "(:module IS NULL OR a.module = :module) AND "
            + "(:action IS NULL OR a.action = :action) AND "
            + "(:userId IS NULL OR a.user.userId = :userId) AND "
            + "(:fromDate IS NULL OR a.timestamp >= :fromDate) AND "
            + "(:toDate IS NULL OR a.timestamp <= :toDate) ORDER BY a.timestamp DESC")
    List<AuditLog> filterList(@Param("module") String module,
                              @Param("action") AuditAction action,
                              @Param("userId") Integer userId,
                              @Param("fromDate") LocalDateTime fromDate,
                              @Param("toDate") LocalDateTime toDate);

    /** Count per module + action for the summary / dashboard (endpoint 4). */
        @Query("SELECT a.module, a.action, COUNT(a) FROM IamAuditLog a GROUP BY a.module, a.action ORDER BY a.module")
    List<Object[]> summaryByModuleAndAction();

        @Query("SELECT a.module, COUNT(a) FROM IamAuditLog a GROUP BY a.module")
    List<Object[]> countByModule();

    long countByTimestampAfter(LocalDateTime from);

    long countByActionAndReasonContainingIgnoreCase(AuditAction action, String reasonFragment);
}
