package com.cts.pharmaTrack.module
    .batchManufacturing.repository;

import com.cts.pharmaTrack.module
    .batchManufacturing.entity.BatchRecord;
import org.springframework.data.jpa.repository
    .JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BatchRecordRepository
    extends JpaRepository<BatchRecord, Integer> {

    Optional<BatchRecord> findByBatchNumber(
        String batchNumber);
    List<BatchRecord> findByStatus(String status);
    List<BatchRecord> findByManufacturingSiteId(
        int siteId);
}