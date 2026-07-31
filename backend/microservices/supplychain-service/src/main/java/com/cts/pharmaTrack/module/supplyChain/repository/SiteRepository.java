package com.cts.pharmaTrack.module.supplyChain.repository;

import com.cts.pharmaTrack.module.supplyChain.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("supplyChainSiteRepository")
public interface SiteRepository extends JpaRepository<Site, Integer> {
}
