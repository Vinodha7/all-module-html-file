package com.cts.pharmaTrack.module.supplyChain.repository;

import com.cts.pharmaTrack.module.supplyChain.entity.DrugShipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DrugShipmentRepository
        extends JpaRepository<DrugShipment, Integer> {
    List<DrugShipment> findByBatchBatchId(int batchId);
    List<DrugShipment> findByToSiteSiteId(int toSiteId);
    List<DrugShipment> findByStatus(DrugShipment.ShipmentStatus status);
}