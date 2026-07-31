package com.cts.pharmaTrack.module.clinicalTrial.service;

import com.cts.pharmaTrack.module.clinicalTrial.dto.request.ClinicalTrialRequestDTO;
import com.cts.pharmaTrack.module.clinicalTrial.dto.response.ClinicalTrialResponseDTO;
import com.cts.pharmaTrack.module.clinicalTrial.entity.ClinicalTrial;
import com.cts.pharmaTrack.module.clinicalTrial.enums.TrialStatus;
import com.cts.pharmaTrack.module.clinicalTrial.exception.DuplicateTrialCodeException;
import com.cts.pharmaTrack.module.clinicalTrial.exception.TrialNotFoundException;
import com.cts.pharmaTrack.module.clinicalTrial.repository.ClinicalTrialRepository;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClinicalTrialService {

    private static final Logger logger =
            LoggerFactory.getLogger(ClinicalTrialService.class);

    @Autowired
    private ClinicalTrialRepository clinicalTrialRepository;

    @Autowired
    private NotificationPublisher notificationPublisher;

    // ── CREATE TRIAL ──────────────────────────────────────────────────────────

    public ClinicalTrialResponseDTO createTrial(
            ClinicalTrialRequestDTO request) {

        logger.info("Request received to create trial with code: {}",
                request.getTrialCode());

        if (request.getTrialCode() == null
                || request.getTrialCode().trim().isEmpty()) {
            logger.error("Trial code is missing");
            throw new IllegalArgumentException("Trial code is mandatory");
        }
        if (request.getPhase() == null) {
            logger.error("Phase is missing for trialCode: {}",
                    request.getTrialCode());
            throw new IllegalArgumentException(
                    "Phase is mandatory and must be one of I, II, III, IV");
        }
        if (request.getIndication() == null
                || request.getIndication().trim().isEmpty()) {
            logger.error("Indication is missing for trialCode: {}",
                    request.getTrialCode());
            throw new IllegalArgumentException("Indication is mandatory");
        }
        if (request.getPlannedSubjects() <= 0) {
            logger.error("Planned subjects is invalid for trialCode: {}",
                    request.getTrialCode());
            throw new IllegalArgumentException(
                    "Planned subjects must be greater than zero");
        }
        if (request.getStartDate() == null) {
            logger.error("Start date is missing for trialCode: {}",
                    request.getTrialCode());
            throw new IllegalArgumentException("Start date is mandatory");
        }
        if (request.getPrincipalInvestigatorId() <= 0) {
            logger.error(
                    "Principal investigator ID is missing for trialCode: {}",
                    request.getTrialCode());
            throw new IllegalArgumentException(
                    "Principal investigator ID is mandatory");
        }
        if (request.getEndDate() != null
                && !request.getEndDate().isAfter(request.getStartDate())) {
            logger.error(
                    "End date is not after start date for trialCode: {}",
                    request.getTrialCode());
            throw new IllegalArgumentException(
                    "End date must be after start date");
        }
        if (clinicalTrialRepository.existsByTrialCode(
                request.getTrialCode().trim())) {
            logger.error("Duplicate trial code found: {}",
                    request.getTrialCode());
            throw new DuplicateTrialCodeException(
                    request.getTrialCode().trim());
        }

        ClinicalTrial clinicalTrial = new ClinicalTrial();
        clinicalTrial.setTrialCode(request.getTrialCode().trim());
        clinicalTrial.setProductId(request.getProductId());
        clinicalTrial.setPhase(request.getPhase());
        clinicalTrial.setIndication(request.getIndication().trim());
        clinicalTrial.setPlannedSubjects(request.getPlannedSubjects());
        clinicalTrial.setStartDate(request.getStartDate());
        clinicalTrial.setEndDate(request.getEndDate());
        clinicalTrial.setPrincipalInvestigatorId(
                request.getPrincipalInvestigatorId());

        ClinicalTrial savedTrial =
                clinicalTrialRepository.save(clinicalTrial);
        logger.info("Trial created successfully with trialId: {}",
                savedTrial.getTrialId());

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Trial " + savedTrial.getTrialCode()
                        + " (id " + savedTrial.getTrialId() + ") was created");

        return mapToResponseDTO(savedTrial);
    }

    // ── GET ALL TRIALS ────────────────────────────────────────────────────────

    public List<ClinicalTrialResponseDTO> getAllTrials() {
        logger.info("Request received to get all trials");
        List<ClinicalTrial> trials = clinicalTrialRepository.findAll();
        if (trials.isEmpty()) {
            logger.info("No trials found, returning empty list");
            return Collections.emptyList();
        }
        logger.info("Fetched {} trials successfully", trials.size());
        return trials.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ── GET TRIAL BY ID ───────────────────────────────────────────────────────

    public ClinicalTrialResponseDTO getTrialById(int trialId) {
        logger.info("Request received to get trial with trialId: {}",
                trialId);
        ClinicalTrial clinicalTrial = clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found with trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });
        logger.info("Trial fetched successfully with trialId: {}",
                trialId);
        return mapToResponseDTO(clinicalTrial);
    }

    // ── UPDATE TRIAL ──────────────────────────────────────────────────────────

    public ClinicalTrialResponseDTO updateTrial(
            int trialId, ClinicalTrialRequestDTO request) {

        logger.info("Request received to update trial with trialId: {}",
                trialId);

        ClinicalTrial clinicalTrial = clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found with trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });

        if (request.getPhase() == null) {
            throw new IllegalArgumentException(
                    "Phase is mandatory and must be one of I, II, III, IV");
        }
        if (request.getIndication() == null
                || request.getIndication().trim().isEmpty()) {
            throw new IllegalArgumentException("Indication is mandatory");
        }
        if (request.getPlannedSubjects() <= 0) {
            throw new IllegalArgumentException(
                    "Planned subjects must be greater than zero");
        }
        if (request.getStartDate() == null) {
            throw new IllegalArgumentException("Start date is mandatory");
        }
        if (request.getPrincipalInvestigatorId() <= 0) {
            throw new IllegalArgumentException(
                    "Principal investigator ID is mandatory");
        }
        if (request.getEndDate() != null
                && !request.getEndDate().isAfter(request.getStartDate())) {
            throw new IllegalArgumentException(
                    "End date must be after start date");
        }

        clinicalTrial.setProductId(request.getProductId());
        clinicalTrial.setPhase(request.getPhase());
        clinicalTrial.setIndication(request.getIndication().trim());
        clinicalTrial.setPlannedSubjects(request.getPlannedSubjects());
        clinicalTrial.setStartDate(request.getStartDate());
        clinicalTrial.setEndDate(request.getEndDate());
        clinicalTrial.setPrincipalInvestigatorId(
                request.getPrincipalInvestigatorId());

        ClinicalTrial updatedTrial =
                clinicalTrialRepository.save(clinicalTrial);
        logger.info("Trial updated successfully with trialId: {}",
                trialId);

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Trial id " + updatedTrial.getTrialId() + " was updated");

        return mapToResponseDTO(updatedTrial);
    }

    // ── UPDATE TRIAL STATUS ───────────────────────────────────────────────────

    public ClinicalTrialResponseDTO updateTrialStatus(
            int trialId, String newStatus) {

        logger.info(
                "Request received to update status for trialId: {}",
                trialId);

        ClinicalTrial clinicalTrial = clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found with trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });

        TrialStatus currentStatus = clinicalTrial.getStatus();
        TrialStatus requestedStatus;

        try {
            requestedStatus = TrialStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid status value: {}", newStatus);
            throw new IllegalArgumentException(
                    "Invalid status value: " + newStatus +
                    ". Allowed values are Draft, Active, Suspended," +
                    " Completed, Terminated");
        }

        validateTrialStatusTransition(currentStatus, requestedStatus);

        clinicalTrial.setStatus(requestedStatus);
        ClinicalTrial updatedTrial =
                clinicalTrialRepository.save(clinicalTrial);
        logger.info(
                "Trial status updated to {} for trialId: {}",
                newStatus, trialId);

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Trial id " + updatedTrial.getTrialId()
                        + " status changed to " + updatedTrial.getStatus());

        return mapToResponseDTO(updatedTrial);
    }

    // ── STATUS TRANSITION VALIDATOR ───────────────────────────────────────────

    private void validateTrialStatusTransition(
            TrialStatus current, TrialStatus next) {

        boolean valid = false;

        switch (current) {
            case Draft:
                valid = next == TrialStatus.Active;
                break;
            case Active:
                valid = next == TrialStatus.Suspended
                        || next == TrialStatus.Completed
                        || next == TrialStatus.Terminated;
                break;
            case Suspended:
                valid = next == TrialStatus.Active
                        || next == TrialStatus.Terminated;
                break;
            case Completed:
            case Terminated:
                valid = false;
                break;
            default:
                valid = false;
        }

        if (!valid) {
            logger.error(
                    "Invalid status transition from {} to {}",
                    current, next);
            throw new IllegalArgumentException(
                    "Invalid status transition from "
                    + current + " to " + next);
        }
    }

    // ── MAPPER ────────────────────────────────────────────────────────────────

    private ClinicalTrialResponseDTO mapToResponseDTO(
            ClinicalTrial savedTrial) {
        ClinicalTrialResponseDTO response = new ClinicalTrialResponseDTO();
        response.setTrialId(savedTrial.getTrialId());
        response.setTrialCode(savedTrial.getTrialCode());
        response.setProductId(savedTrial.getProductId());
        response.setPhase(savedTrial.getPhase().name());
        response.setIndication(savedTrial.getIndication());
        response.setPlannedSubjects(savedTrial.getPlannedSubjects());
        response.setStartDate(savedTrial.getStartDate().toString());
        response.setEndDate(savedTrial.getEndDate() != null
                ? savedTrial.getEndDate().toString() : null);
        response.setPrincipalInvestigatorId(
                savedTrial.getPrincipalInvestigatorId());
        response.setStatus(savedTrial.getStatus().name());
        response.setMessage("Trial updated successfully");
        return response;
    }
}
