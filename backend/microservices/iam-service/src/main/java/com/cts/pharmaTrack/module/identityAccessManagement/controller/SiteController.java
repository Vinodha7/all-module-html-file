package com.cts.pharmaTrack.module.identityAccessManagement.controller;

import com.cts.pharmaTrack.module.identityAccessManagement.dto.response.ApiResponse;
import com.cts.pharmaTrack.module.identityAccessManagement.entity.Site;
import com.cts.pharmaTrack.module.identityAccessManagement.repository.SiteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pharmaTrack/identityAccess")
public class SiteController {

    private static final Logger logger = LoggerFactory.getLogger(SiteController.class);
    private final SiteRepository siteRepository;

    public SiteController(SiteRepository siteRepository) {
        this.siteRepository = siteRepository;
    }

    @PostMapping("/sites")
    public ResponseEntity<ApiResponse<Site>> createSite(@RequestBody Site site) {
        logger.info("POST /sites request received for site: {}", site.getSiteName());
        if (site.getSiteName() == null || site.getSiteName().trim().isEmpty()) {
            throw new IllegalArgumentException("Site name is required");
        }
        if (site.getCountry() == null || site.getCountry().trim().isEmpty()) {
            throw new IllegalArgumentException("Country is required");
        }
        Site saved = siteRepository.save(site);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Site created successfully", saved));
    }

    @GetMapping("/sites")
    public ResponseEntity<ApiResponse<List<Site>>> fetchSites() {
        logger.info("GET /sites request received");
        List<Site> sites = siteRepository.findAll();
        return ResponseEntity.ok(ApiResponse.success("Sites fetched", sites));
    }
}
