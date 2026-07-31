package com.cts.pharmaTrack.module.supplyChain.repository;

import com.cts.pharmaTrack.module.supplyChain.entity.SiteInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SiteInventoryRepository
        extends JpaRepository<SiteInventory, Integer> {
    List<SiteInventory> findBySiteId(int siteId);
    List<SiteInventory> findByBatchId(int batchId);
}