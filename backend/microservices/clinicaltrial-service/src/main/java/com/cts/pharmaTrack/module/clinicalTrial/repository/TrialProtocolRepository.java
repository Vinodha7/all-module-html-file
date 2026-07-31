package com.cts.pharmaTrack.module.clinicalTrial.repository;

import com.cts.pharmaTrack.module.clinicalTrial.entity.TrialProtocol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TrialProtocolRepository
        extends JpaRepository<TrialProtocol, Integer> {

    boolean existsByTrialIdAndVersionNumber(
            int trialId, String versionNumber);

    List<TrialProtocol> findByTrialId(int trialId);
}