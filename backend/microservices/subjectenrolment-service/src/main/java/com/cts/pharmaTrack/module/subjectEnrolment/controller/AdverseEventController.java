package com.cts.pharmaTrack.module.subjectEnrolment.controller;

// returning plain message strings for mutating endpoints
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cts.pharmaTrack.module.subjectEnrolment.dto.AdverseEventRequest;
import com.cts.pharmaTrack.module.subjectEnrolment.dto.AdverseEventResponse;
import com.cts.pharmaTrack.module.subjectEnrolment.service.AdverseEventService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/pharmaTrack/subjectEnrolment")
@RequiredArgsConstructor
public class AdverseEventController {

    private static final Logger logger = LoggerFactory.getLogger(AdverseEventController.class);
    private final AdverseEventService adverseEventService;

    @PostMapping("/createEvents")
    public ResponseEntity<String> create(
            @Valid @RequestBody AdverseEventRequest request) {
        logger.info("POST /createEvents request received with aeId: {}", request.getAeId());
        adverseEventService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                        .body("Adverse event created successfully");
    }

    @GetMapping("/fetchEvents")
    public ResponseEntity<List<AdverseEventResponse>> fetchAll() {
        logger.info("GET /fetchEvents request received");
        return ResponseEntity.ok(adverseEventService.getAll());
    }

    @GetMapping("/fetchEventById")
    public ResponseEntity<AdverseEventResponse> fetchById(
            @RequestParam String aeId) {
        logger.info("GET /fetchEventById request received with aeId: {}", aeId);
        return ResponseEntity.ok(adverseEventService.getById(aeId));
    }

    @GetMapping("/fetchEventsBySubjectId")
    public ResponseEntity<List<AdverseEventResponse>> fetchBySubjectId(
            @RequestParam Integer subjectId) {
        logger.info("GET /fetchEventsBySubjectId request received with subjectId: {}", subjectId);
        return ResponseEntity.ok(adverseEventService.getBySubjectId(subjectId));
    }

    @PutMapping("/updateEvents")
    public ResponseEntity<String> update(
            @Valid @RequestBody AdverseEventRequest request) {
        logger.info("PUT /updateEvents request received with aeId: {}", request.getAeId());
        adverseEventService.update(request);
        return ResponseEntity.ok("Adverse event updated successfully");
            }

    
}
