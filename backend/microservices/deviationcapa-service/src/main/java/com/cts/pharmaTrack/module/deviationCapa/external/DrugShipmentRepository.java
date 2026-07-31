package com.cts.pharmaTrack.module.deviationCapa.external;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository("deviationDrugShipmentRepository")
public interface DrugShipmentRepository extends JpaRepository<DrugShipment, Integer> {
    Optional<DrugShipment> findFirstByBatchBatchNumber(String batchNumber);
}
