package com.cts.pharmaTrack.module.regulatoryAffairs.controller;

// returning plain message strings for mutating endpoints
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryMilestoneRequest;
import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryMilestoneResponse;
import com.cts.pharmaTrack.module.regulatoryAffairs.service.RegulatoryMilestoneService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/pharmaTrack/regulatoryAffairs")
@RequiredArgsConstructor
public class RegulatoryMilestoneController {

    private static final Logger logger = LoggerFactory.getLogger(RegulatoryMilestoneController.class);
    private final RegulatoryMilestoneService milestoneService;

        @PostMapping("/createMilestone")
        public ResponseEntity<String> create(
            @Valid @RequestBody RegulatoryMilestoneRequest request) {
        logger.info("POST /createMilestone request received with milestoneId: {}", request.getMilestoneId());
        milestoneService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body("Milestone created successfully");
        }

    @GetMapping("/fetchMilestones")
    public ResponseEntity<List<RegulatoryMilestoneResponse>> fetchAll() {
        logger.info("GET /fetchMilestones request received");
        return ResponseEntity.ok(milestoneService.getAll());
    }

    @GetMapping("/fetchMilestoneById")
    public ResponseEntity<RegulatoryMilestoneResponse> fetchById(@RequestParam String milestoneId) {
        logger.info("GET /fetchMilestoneById request received with milestoneId: {}", milestoneId);
        return ResponseEntity.ok(milestoneService.getById(milestoneId));
    }

    @GetMapping("/fetchMilestonesByDossier")
    public ResponseEntity<List<RegulatoryMilestoneResponse>> fetchByDossier(
            @RequestParam String dossierId) {
        logger.info("GET /fetchMilestonesByDossier request received with dossierId: {}", dossierId);
        return ResponseEntity.ok(milestoneService.getByDossier(dossierId));
    }

    @PutMapping("/updateMilestone")
    public ResponseEntity<String> update(
            @Valid @RequestBody RegulatoryMilestoneRequest request) {
        logger.info("PUT /updateMilestone request received with milestoneId: {}", request.getMilestoneId());
        milestoneService.update(request);
        return ResponseEntity.ok("Milestone updated successfully");
    }

    
}
