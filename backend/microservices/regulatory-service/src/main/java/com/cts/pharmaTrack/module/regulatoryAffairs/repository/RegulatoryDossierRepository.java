package com.cts.pharmaTrack.module.regulatoryAffairs.repository;

import com.cts.pharmaTrack.module.regulatoryAffairs.entity.RegulatoryDossier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RegulatoryDossierRepository extends JpaRepository<RegulatoryDossier, String> {

    List<RegulatoryDossier> findByStatus(String status);

    List<RegulatoryDossier> findByProductId(String productId);
}
