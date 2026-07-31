package com.cts.pharmaTrack.module.clinicalTrial.controller;

import com.cts.pharmaTrack.module.clinicalTrial.dto.request.TrialSiteRequestDTO;
import com.cts.pharmaTrack.module.clinicalTrial.dto.response.TrialSiteResponseDTO;
import com.cts.pharmaTrack.module.clinicalTrial.service.TrialSiteService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/pharmaTrack/trialSite")
public class TrialSiteController {

    private static final Logger logger =
            LoggerFactory.getLogger(TrialSiteController.class);

    @Autowired
    private TrialSiteService trialSiteService;

    //CREATE SITE

    @PostMapping("/createSite/{trialId}")
    public ResponseEntity<Map<String, String>> createSite(
            @PathVariable int trialId,
            @RequestBody TrialSiteRequestDTO request) {
        logger.info("POST /createSite called for trialId: {}",
                trialId);
        trialSiteService.createSite(trialId, request);
        return ResponseEntity.status(201)
                .body(Map.of("message", "Site created successfully"));
    }

    //GET ALL SITES

    @GetMapping("/getAllSites/{trialId}")
    public ResponseEntity<List<TrialSiteResponseDTO>> getAllSites(
            @PathVariable int trialId) {
        logger.info("GET /getAllSites called for trialId: {}",
                trialId);
        List<TrialSiteResponseDTO> response =
                trialSiteService.getAllSites(trialId);
        return ResponseEntity.status(200).body(response);
    }

    //GET SITE BY ID

    @GetMapping("/getSiteById/{trialId}/{trialSiteId}")
    public ResponseEntity<TrialSiteResponseDTO> getSiteById(
            @PathVariable int trialId,
            @PathVariable int trialSiteId) {
        logger.info(
                "GET /getSiteById called for trialId: {}" +
                " trialSiteId: {}", trialId, trialSiteId);
        TrialSiteResponseDTO response =
                trialSiteService.getSiteById(trialId, trialSiteId);
        return ResponseEntity.status(200).body(response);
    }

    //GET BY TRIAL AND SITE

    @GetMapping("/getByTrialAndSite/{trialId}/{siteId}")
    public ResponseEntity<TrialSiteResponseDTO> getByTrialAndSite(
            @PathVariable int trialId,
            @PathVariable int siteId) {
        logger.info(
                "GET /getByTrialAndSite called for trialId: {}" +
                " siteId: {}", trialId, siteId);
        TrialSiteResponseDTO response =
                trialSiteService.getByTrialAndSite(trialId, siteId);
        return ResponseEntity.status(200).body(response);
    }

    //UPDATE SITE

    @PutMapping("/updateSite/{trialId}/{trialSiteId}")
    public ResponseEntity<Map<String, String>> updateSite(
            @PathVariable int trialId,
            @PathVariable int trialSiteId,
            @RequestBody TrialSiteRequestDTO request) {
        logger.info(
                "PUT /updateSite called for trialId: {}" +
                " trialSiteId: {}", trialId, trialSiteId);
        trialSiteService.updateSite(trialId, trialSiteId, request);
        return ResponseEntity.status(200)
                .body(Map.of("message",
                        "Site updated successfully"));
    }

    //UPDATE SITE STATUS

    @PutMapping("/updateSiteStatus/{trialId}/{trialSiteId}")
    public ResponseEntity<Map<String, String>> updateSiteStatus(
            @PathVariable int trialId,
            @PathVariable int trialSiteId,
            @RequestBody Map<String, String> requestBody) {
        logger.info(
                "PUT /updateSiteStatus called for trialId: {}" +
                " trialSiteId: {}", trialId, trialSiteId);
        String newStatus = requestBody.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            logger.error("Status is missing in request body");
            throw new IllegalArgumentException(
                    "Status is mandatory");
        }
        trialSiteService.updateSiteStatus(
                trialId, trialSiteId, newStatus.trim());
        return ResponseEntity.status(200)
                .body(Map.of("message",
                        "Site status updated successfully"));
    }
}