package com.cts.pharmaTrack.module.supplyChain.repository;

import com.cts.pharmaTrack.module.supplyChain.entity.ColdChainLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ColdChainLogRepository
        extends JpaRepository<ColdChainLog, Integer> {
    List<ColdChainLog> findByShipmentShipmentId(int shipmentId);
    List<ColdChainLog> findByExcursionFlagTrue();
}