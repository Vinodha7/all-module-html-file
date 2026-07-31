package com.cts.pharmaTrack.module
    .batchManufacturing.repository;

import com.cts.pharmaTrack.module
    .batchManufacturing.entity.RawMaterialUsage;
import org.springframework.data.jpa.repository
    .JpaRepository;
import java.util.List;

public interface RawMaterialRepository
    extends JpaRepository<RawMaterialUsage, Integer> {

    List<RawMaterialUsage> findByBatchId(int batchId);
    List<RawMaterialUsage> findByStatus(String status);
    List<RawMaterialUsage> findByMaterialLotNumber(
        String lot);
}