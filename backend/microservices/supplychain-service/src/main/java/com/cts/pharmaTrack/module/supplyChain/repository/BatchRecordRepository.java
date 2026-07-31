package com.cts.pharmaTrack.module.supplyChain.repository;

import com.cts.pharmaTrack.module.supplyChain.entity.BatchRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository("supplyChainBatchRecordRepository")
public interface BatchRecordRepository extends JpaRepository<BatchRecord, Integer> {
    Optional<BatchRecord> findByBatchNumber(String batchNumber);
}
