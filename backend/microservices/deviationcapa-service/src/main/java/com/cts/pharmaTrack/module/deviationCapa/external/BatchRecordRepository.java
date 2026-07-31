package com.cts.pharmaTrack.module.deviationCapa.external;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository("deviationBatchRecordRepository")
public interface BatchRecordRepository extends JpaRepository<BatchRecord, Integer> {
    Optional<BatchRecord> findByBatchNumber(String batchNumber);
}
