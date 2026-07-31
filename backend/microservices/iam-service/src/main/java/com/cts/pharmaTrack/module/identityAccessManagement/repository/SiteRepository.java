package com.cts.pharmaTrack.module.identityAccessManagement.repository;

import com.cts.pharmaTrack.module.identityAccessManagement.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SiteRepository extends JpaRepository<Site, Integer> {
}
