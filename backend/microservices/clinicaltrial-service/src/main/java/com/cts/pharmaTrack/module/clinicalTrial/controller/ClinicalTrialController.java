package com.cts.pharmaTrack.module.clinicalTrial.controller;

import com.cts.pharmaTrack.module.clinicalTrial.dto.request.ClinicalTrialRequestDTO;
import com.cts.pharmaTrack.module.clinicalTrial.dto.response.ClinicalTrialResponseDTO;
import com.cts.pharmaTrack.module.clinicalTrial.service.ClinicalTrialService;
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
@RequestMapping("/pharmaTrack/clinicalTrial")
public class ClinicalTrialController {

    private static final Logger logger =
            LoggerFactory.getLogger(ClinicalTrialController.class);

    @Autowired
    private ClinicalTrialService clinicalTrialService;

    //CREATE TRIAL

    @PostMapping("/createTrial")
    public ResponseEntity<Map<String, String>> createTrial(
            @RequestBody ClinicalTrialRequestDTO request) {
        logger.info("POST /createTrial called with trialCode: {}",
                request.getTrialCode());
        clinicalTrialService.createTrial(request);
        return ResponseEntity.status(201)
                .body(Map.of("message", "Trial created successfully"));
    }

    //GET ALL TRIALS

    @GetMapping("/getAllTrials")
    public ResponseEntity<List<ClinicalTrialResponseDTO>> getAllTrials() {
        logger.info("GET /getAllTrials called");
        List<ClinicalTrialResponseDTO> response =
                clinicalTrialService.getAllTrials();
        return ResponseEntity.status(200).body(response);
    }

    //GET TRIAL BY ID

    @GetMapping("/getTrialById/{trialId}")
    public ResponseEntity<ClinicalTrialResponseDTO> getTrialById(
            @PathVariable int trialId) {
        logger.info("GET /getTrialById called with trialId: {}",
                trialId);
        ClinicalTrialResponseDTO response =
                clinicalTrialService.getTrialById(trialId);
        return ResponseEntity.status(200).body(response);
    }

    //UPDATE TRIAL
    @PutMapping("/updateTrial/{trialId}")
    public ResponseEntity<Map<String, String>> updateTrial(
            @PathVariable int trialId,
            @RequestBody ClinicalTrialRequestDTO request) {
        logger.info("PUT /updateTrial called with trialId: {}",
                trialId);
        clinicalTrialService.updateTrial(trialId, request);
        return ResponseEntity.status(200)
                .body(Map.of("message", "Trial updated successfully"));
    }

    //UPDATE TRIAL STATUS

    @PutMapping("/updateTrialStatus/{trialId}")
    public ResponseEntity<Map<String, String>> updateTrialStatus(
            @PathVariable int trialId,
            @RequestBody Map<String, String> requestBody) {
        logger.info(
                "PUT /updateTrialStatus called with trialId: {}",
                trialId);
        String newStatus = requestBody.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            logger.error("Status is missing in request body");
            throw new IllegalArgumentException(
                    "Status is mandatory");
        }
        clinicalTrialService.updateTrialStatus(trialId,
                newStatus.trim());
        return ResponseEntity.status(200)
                .body(Map.of("message",
                        "Trial status updated successfully"));
    }
}