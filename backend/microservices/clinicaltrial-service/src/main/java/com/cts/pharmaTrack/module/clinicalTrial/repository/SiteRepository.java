package com.cts.pharmaTrack.module.clinicalTrial.repository;

import com.cts.pharmaTrack.module.clinicalTrial.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("clinicalTrialSiteRepository")
public interface SiteRepository extends JpaRepository<Site, Integer> {
}
