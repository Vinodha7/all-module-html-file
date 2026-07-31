package com.cts.pharmaTrack.module.regulatoryAffairs.repository;

import com.cts.pharmaTrack.module.regulatoryAffairs.entity.RegulatoryMilestone;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RegulatoryMilestoneRepository extends JpaRepository<RegulatoryMilestone, String> {

    List<RegulatoryMilestone> findByDossierId(String dossierId);

    boolean existsByDossierId(String dossierId);
}
