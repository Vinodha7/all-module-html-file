package com.cts.pharmaTrack.common.workflow;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Store of {@link RecordLifecycleHistory} rows. Scanned per owning service (Spring
 * Boot's default repository scan covers {@code com.cts.pharmaTrack.**}).
 */
public interface RecordLifecycleHistoryRepository extends JpaRepository<RecordLifecycleHistory, Long> {

    /** Full lifecycle of one record, oldest first. */
    List<RecordLifecycleHistory> findByEntityTypeAndEntityIdOrderByChangedAtAsc(String entityType, String entityId);
}
