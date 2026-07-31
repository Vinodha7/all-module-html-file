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

import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryDossierRequest;
import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryDossierResponse;
import com.cts.pharmaTrack.module.regulatoryAffairs.service.RegulatoryDossierService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/pharmaTrack/regulatoryAffairs")
@RequiredArgsConstructor
public class RegulatoryDossierController {

    private static final Logger logger = LoggerFactory.getLogger(RegulatoryDossierController.class);
    private final RegulatoryDossierService dossierService;

        @PostMapping("/createDossier")
        public ResponseEntity<String> create(
            @Valid @RequestBody RegulatoryDossierRequest request) {
        logger.info("POST /createDossier request received with dossierId: {}", request.getDossierId());
        dossierService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body("Dossier created successfully");
        }

    @GetMapping("/fetchDossiers")
    public ResponseEntity<List<RegulatoryDossierResponse>> fetchAll() {
        logger.info("GET /fetchDossiers request received");
        return ResponseEntity.ok(dossierService.getAll());
    }

    @GetMapping("/fetchDossierById")
    public ResponseEntity<RegulatoryDossierResponse> fetchById(@RequestParam String dossierId) {
        logger.info("GET /fetchDossierById request received with dossierId: {}", dossierId);
        return ResponseEntity.ok(dossierService.getById(dossierId));
    }

    @PutMapping("/updateDossier")
    public ResponseEntity<String> update(
            @Valid @RequestBody RegulatoryDossierRequest request) {
        logger.info("PUT /updateDossier request received with dossierId: {}", request.getDossierId());
        dossierService.update(request);
        return ResponseEntity.ok("Dossier updated successfully");
    }

    
}
