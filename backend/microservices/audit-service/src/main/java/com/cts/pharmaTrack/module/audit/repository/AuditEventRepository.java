package com.cts.pharmaTrack.module.audit.repository;

import com.cts.pharmaTrack.module.audit.entity.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Insert-and-read-only persistence for {@link AuditEvent}.
 *
 * <p>Extends the bare Spring Data {@link Repository} marker (deliberately
 * <strong>not</strong> {@code JpaRepository}/{@code CrudRepository}) so no
 * {@code delete*} or bulk-mutation methods are ever exposed — the audit trail is
 * append-only. Only the methods declared below are available; each is backed by
 * the store's base implementation (save/exists/find) or a derived query.
 *
 * <p>Immutability is layered: this interface has no update/delete operation, the
 * entity marks its audit-critical columns {@code updatable = false}, the ingest
 * service dedupes on {@code eventId} before saving, and the runtime DB user is
 * granted only {@code INSERT}/{@code SELECT} (see {@code docs/audit-db-hardening.md}).
 */
public interface AuditEventRepository extends Repository<AuditEvent, String> {

    // ── Write (insert) ──────────────────────────────────────────────────────
    AuditEvent save(AuditEvent event);

    // ── Read ────────────────────────────────────────────────────────────────
    boolean existsById(String eventId);

    Optional<AuditEvent> findById(String eventId);

    Page<AuditEvent> findAll(Pageable pageable);

    // ── Filtered reads (paged) ──────────────────────────────────────────────
    Page<AuditEvent> findByModule(String module, Pageable pageable);

    Page<AuditEvent> findByAction(String action, Pageable pageable);

    Page<AuditEvent> findByEntityTypeAndEntityId(String entityType, String entityId, Pageable pageable);

    Page<AuditEvent> findByPerformedBy(String performedBy, Pageable pageable);

    Page<AuditEvent> findByCorrelationId(String correlationId, Pageable pageable);

    Page<AuditEvent> findByPerformedAtBetween(LocalDateTime from, LocalDateTime to, Pageable pageable);

    // ── Module-scoped dynamic search + summary (read-only, A12) ─────────────
    // Every predicate except the module scope is optional (":p IS NULL OR ...").
    // The IN :modules clause enforces RBAC visibility; callers must pass a
    // non-empty module set (an empty set is short-circuited in the service).

    @Query("""
            SELECT e FROM AuditEvent e
            WHERE e.module IN :modules
              AND (:module IS NULL OR e.module = :module)
              AND (:action IS NULL OR e.action = :action)
              AND (:entityType IS NULL OR e.entityType = :entityType)
              AND (:entityId IS NULL OR e.entityId = :entityId)
              AND (:performedBy IS NULL OR e.performedBy = :performedBy)
              AND (:correlationId IS NULL OR e.correlationId = :correlationId)
              AND (:from IS NULL OR e.performedAt >= :from)
              AND (:to IS NULL OR e.performedAt <= :to)
            """)
    Page<AuditEvent> search(
            @Param("modules") Collection<String> modules,
            @Param("module") String module,
            @Param("action") String action,
            @Param("entityType") String entityType,
            @Param("entityId") String entityId,
            @Param("performedBy") String performedBy,
            @Param("correlationId") String correlationId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable);

    @Query("SELECT e.module, COUNT(e) FROM AuditEvent e WHERE e.module IN :modules GROUP BY e.module")
    List<Object[]> moduleCounts(@Param("modules") Collection<String> modules);

    @Query("SELECT e.action, COUNT(e) FROM AuditEvent e WHERE e.module IN :modules GROUP BY e.action")
    List<Object[]> actionCounts(@Param("modules") Collection<String> modules);
}
