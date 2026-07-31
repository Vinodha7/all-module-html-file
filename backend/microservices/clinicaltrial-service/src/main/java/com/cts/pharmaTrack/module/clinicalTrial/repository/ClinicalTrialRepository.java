package com.cts.pharmaTrack.module.clinicalTrial.repository;

import com.cts.pharmaTrack.module.clinicalTrial.entity.ClinicalTrial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClinicalTrialRepository
        extends JpaRepository<ClinicalTrial, Integer> {

    boolean existsByTrialCode(String trialCode);
}