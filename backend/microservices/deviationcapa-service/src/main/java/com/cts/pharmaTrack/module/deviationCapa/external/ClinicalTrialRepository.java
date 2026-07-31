package com.cts.pharmaTrack.module.deviationCapa.external;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository("deviationClinicalTrialRepository")
public interface ClinicalTrialRepository extends JpaRepository<ClinicalTrial, Integer> {
    Optional<ClinicalTrial> findByTrialCode(String trialCode);
}
