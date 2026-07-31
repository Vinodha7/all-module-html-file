package com.cts.pharmaTrack.module
    .batchManufacturing.repository;

import com.cts.pharmaTrack.module
    .batchManufacturing.entity.QCTest;
import org.springframework.data.jpa.repository
    .JpaRepository;
import java.util.List;

public interface QCTestRepository
    extends JpaRepository<QCTest, Integer> {

    List<QCTest> findByBatchId(int batchId);
    List<QCTest> findByStatus(String status);
    List<QCTest> findByTestedById(int testedById);
}