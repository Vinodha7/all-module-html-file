package com.cts.pharmaTrack.module.clinicalTrial.service;

import com.cts.pharmaTrack.module.clinicalTrial.dto.request.TrialProtocolRequestDTO;
import com.cts.pharmaTrack.module.clinicalTrial.dto.response.TrialProtocolResponseDTO;
import com.cts.pharmaTrack.module.clinicalTrial.entity.ClinicalTrial;
import com.cts.pharmaTrack.module.clinicalTrial.entity.TrialProtocol;
import com.cts.pharmaTrack.module.clinicalTrial.enums.ProtocolStatus;
import com.cts.pharmaTrack.module.clinicalTrial.enums.TrialStatus;
import com.cts.pharmaTrack.module.clinicalTrial.exception.DuplicateProtocolVersionException;
import com.cts.pharmaTrack.module.clinicalTrial.exception.ProtocolNotFoundException;
import com.cts.pharmaTrack.module.clinicalTrial.exception.TrialNotFoundException;
import com.cts.pharmaTrack.module.clinicalTrial.repository.ClinicalTrialRepository;
import com.cts.pharmaTrack.module.clinicalTrial.repository.TrialProtocolRepository;
import com.cts.pharmaTrack.module.clinicalTrial.workflow.TrialProtocolWorkflow;
import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.config.FeatureFlags;
import com.cts.pharmaTrack.common.workflow.RecordLifecycleHistory;
import com.cts.pharmaTrack.common.workflow.TransitionDecision;
import com.cts.pharmaTrack.common.workflow.WorkflowService;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TrialProtocolService {

    private static final Logger logger =
            LoggerFactory.getLogger(TrialProtocolService.class);

    @Autowired
    private TrialProtocolRepository trialProtocolRepository;

    @Autowired
    private ClinicalTrialRepository clinicalTrialRepository;

    @Autowired
    private FeatureFlags featureFlags;

    @Autowired
    private WorkflowService workflowService;

    @Autowired
    private NotificationPublisher notificationPublisher;

    // ── CREATE PROTOCOL ───────────────────────────────────────────────────────

    public TrialProtocolResponseDTO createProtocol(
            int trialId, TrialProtocolRequestDTO request) {

        logger.info(
                "Request received to create protocol for trialId: {}",
                trialId);

        ClinicalTrial trial = clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });

        if (trial.getStatus() == TrialStatus.Terminated) {
            logger.error(
                    "Cannot add protocol to Terminated trial: {}",
                    trialId);
            throw new IllegalStateException(
                    "Cannot add protocol to a Terminated trial");
        }

        if (request.getVersionNumber() == null
                || request.getVersionNumber().trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Version number is mandatory");
        }
        if (request.getInclusionCriteria() == null
                || request.getInclusionCriteria().trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Inclusion criteria is mandatory");
        }
        if (request.getExclusionCriteria() == null
                || request.getExclusionCriteria().trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Exclusion criteria is mandatory");
        }
        if (request.getEndpoints() == null
                || request.getEndpoints().trim().isEmpty()) {
            throw new IllegalArgumentException("Endpoints is mandatory");
        }
        // Effective date is optional — no mandatory check (aligns with frontend)
        if (trialProtocolRepository.existsByTrialIdAndVersionNumber(
                trialId, request.getVersionNumber().trim())) {
            logger.error(
                    "Duplicate version number {} for trialId: {}",
                    request.getVersionNumber(), trialId);
            throw new DuplicateProtocolVersionException(
                    request.getVersionNumber().trim());
        }

        TrialProtocol trialProtocol = new TrialProtocol();
        trialProtocol.setTrialId(trialId);
        trialProtocol.setVersionNumber(
                request.getVersionNumber().trim());
        trialProtocol.setInclusionCriteria(
                request.getInclusionCriteria().trim());
        trialProtocol.setExclusionCriteria(
                request.getExclusionCriteria().trim());
        trialProtocol.setEndpoints(request.getEndpoints().trim());
        trialProtocol.setEffectiveDate(request.getEffectiveDate());

        TrialProtocol savedProtocol =
                trialProtocolRepository.save(trialProtocol);
        logger.info(
                "Protocol created successfully with protocolId: {}",
                savedProtocol.getProtocolId());

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Protocol " + savedProtocol.getVersionNumber()
                        + " (id " + savedProtocol.getProtocolId()
                        + ") was created for trial " + trialId);

        return mapToResponseDTO(savedProtocol);
    }

    // ── GET ALL PROTOCOLS ─────────────────────────────────────────────────────

    public List<TrialProtocolResponseDTO> getAllProtocols(int trialId) {
        logger.info(
                "Request received to get all protocols for trialId: {}",
                trialId);
        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });
        List<TrialProtocol> protocols =
                trialProtocolRepository.findByTrialId(trialId);
        if (protocols.isEmpty()) {
            logger.info("No protocols found for trialId: {}", trialId);
            return Collections.emptyList();
        }
        logger.info("Fetched {} protocols for trialId: {}",
                protocols.size(), trialId);
        return protocols.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ── GET PROTOCOL BY ID ────────────────────────────────────────────────────

    public TrialProtocolResponseDTO getProtocolById(
            int trialId, int protocolId) {
        logger.info(
                "Request received to get protocol with protocolId: {}" +
                " for trialId: {}", protocolId, trialId);
        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });
        TrialProtocol trialProtocol = trialProtocolRepository
                .findById(protocolId)
                .orElseThrow(() -> {
                    logger.error(
                            "Protocol not found with protocolId: {}",
                            protocolId);
                    return new ProtocolNotFoundException(protocolId);
                });
        logger.info(
                "Protocol fetched successfully with protocolId: {}",
                protocolId);
        return mapToResponseDTO(trialProtocol);
    }

    // ── UPDATE PROTOCOL ───────────────────────────────────────────────────────

    public TrialProtocolResponseDTO updateProtocol(
            int trialId, int protocolId,
            TrialProtocolRequestDTO request) {

        logger.info(
                "Request received to update protocol with protocolId: {}" +
                " for trialId: {}", protocolId, trialId);

        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });

        TrialProtocol trialProtocol = trialProtocolRepository
                .findById(protocolId)
                .orElseThrow(() -> {
                    logger.error(
                            "Protocol not found with protocolId: {}",
                            protocolId);
                    return new ProtocolNotFoundException(protocolId);
                });

        if (trialProtocol.getStatus() != ProtocolStatus.Draft) {
            logger.error(
                    "Protocol {} cannot be updated as status is {}",
                    protocolId, trialProtocol.getStatus());
            throw new IllegalArgumentException(
                    "Protocol can only be updated when status is Draft");
        }

        if (request.getVersionNumber() == null
                || request.getVersionNumber().trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Version number is mandatory");
        }
        if (request.getInclusionCriteria() == null
                || request.getInclusionCriteria().trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Inclusion criteria is mandatory");
        }
        if (request.getExclusionCriteria() == null
                || request.getExclusionCriteria().trim().isEmpty()) {
            throw new IllegalArgumentException(
                    "Exclusion criteria is mandatory");
        }
        if (request.getEndpoints() == null
                || request.getEndpoints().trim().isEmpty()) {
            throw new IllegalArgumentException("Endpoints is mandatory");
        }
        // Effective date is optional — no mandatory check (aligns with frontend)

        trialProtocol.setVersionNumber(
                request.getVersionNumber().trim());
        trialProtocol.setInclusionCriteria(
                request.getInclusionCriteria().trim());
        trialProtocol.setExclusionCriteria(
                request.getExclusionCriteria().trim());
        trialProtocol.setEndpoints(request.getEndpoints().trim());
        trialProtocol.setEffectiveDate(request.getEffectiveDate());

        TrialProtocol updatedProtocol =
                trialProtocolRepository.save(trialProtocol);
        logger.info(
                "Protocol updated successfully with protocolId: {}",
                protocolId);

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Protocol " + updatedProtocol.getVersionNumber()
                        + " (id " + updatedProtocol.getProtocolId()
                        + ") was updated for trial " + trialId);

        return mapToResponseDTO(updatedProtocol);
    }

    // ── UPDATE PROTOCOL STATUS ────────────────────────────────────────────────

    public TrialProtocolResponseDTO updateProtocolStatus(
            int trialId, int protocolId, String newStatus) {

        logger.info(
                "Request received to update status for protocolId: {}" +
                " trialId: {}", protocolId, trialId);

        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });

        TrialProtocol trialProtocol = trialProtocolRepository
                .findById(protocolId)
                .orElseThrow(() -> {
                    logger.error(
                            "Protocol not found with protocolId: {}",
                            protocolId);
                    return new ProtocolNotFoundException(protocolId);
                });

        ProtocolStatus currentStatus = trialProtocol.getStatus();
        ProtocolStatus requestedStatus;

        try {
            requestedStatus = ProtocolStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid status value: {}", newStatus);
            throw new IllegalArgumentException(
                    "Invalid status value: " + newStatus +
                    ". Allowed values are Draft, Approved, Superseded");
        }

        // Wave 4: when the workflow engine is enabled it is the source of truth for
        // transition legality, role authorization and signature gating (Draft →
        // Approved needs a valid APPROVED e-signature). Otherwise fall back to the
        // legacy state-machine so behavior is unchanged when the flag is off.
        boolean workflowEnabled = featureFlags.isWorkflowEnabled();
        TransitionDecision decision = null;
        if (workflowEnabled) {
            decision = workflowService.validateTransition(
                    TrialProtocolWorkflow.DEFINITION,
                    String.valueOf(protocolId),
                    trialProtocol.getVersionNumber(),
                    currentStatus.name(),
                    requestedStatus.name());
        } else {
            validateProtocolStatusTransition(currentStatus, requestedStatus);
        }

        if (requestedStatus == ProtocolStatus.Approved) {
            List<TrialProtocol> allProtocols =
                    trialProtocolRepository.findByTrialId(trialId);
            for (TrialProtocol protocol : allProtocols) {
                if (protocol.getProtocolId() != protocolId
                        && protocol.getStatus()
                        == ProtocolStatus.Approved) {
                    protocol.setStatus(ProtocolStatus.Superseded);
                    trialProtocolRepository.save(protocol);
                }
            }
        }

        trialProtocol.setStatus(requestedStatus);
        TrialProtocol updatedProtocol =
                trialProtocolRepository.save(trialProtocol);
        logger.info(
                "Protocol status updated to {} for protocolId: {}",
                newStatus, protocolId);

        // Wave 4: record lifecycle history + emit the transition CentralAuditEvent.
        if (workflowEnabled) {
            workflowService.recordTransition(
                    AuditModules.CLINICAL_TRIAL,
                    TrialProtocolWorkflow.ENTITY_TYPE,
                    String.valueOf(protocolId),
                    decision,
                    null);
        }

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Protocol id " + updatedProtocol.getProtocolId()
                        + " (trial " + trialId + ") status changed to "
                        + updatedProtocol.getStatus());

        return mapToResponseDTO(updatedProtocol);
    }

    // ── LIFECYCLE HISTORY (Wave 4) ────────────────────────────────────────────

    public List<RecordLifecycleHistory> getProtocolHistory(int trialId, int protocolId) {
        clinicalTrialRepository.findById(trialId)
                .orElseThrow(() -> new TrialNotFoundException(trialId));
        trialProtocolRepository.findById(protocolId)
                .orElseThrow(() -> new ProtocolNotFoundException(protocolId));
        return workflowService.history(
                TrialProtocolWorkflow.ENTITY_TYPE, String.valueOf(protocolId));
    }

    // ── STATUS TRANSITION VALIDATOR ───────────────────────────────────────────

    private void validateProtocolStatusTransition(
            ProtocolStatus current, ProtocolStatus next) {

        boolean valid = false;

        switch (current) {
            case Draft:
                valid = next == ProtocolStatus.Approved;
                break;
            case Approved:
                valid = next == ProtocolStatus.Superseded;
                break;
            case Superseded:
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

    private TrialProtocolResponseDTO mapToResponseDTO(
            TrialProtocol savedProtocol) {
        TrialProtocolResponseDTO response =
                new TrialProtocolResponseDTO();
        response.setProtocolId(savedProtocol.getProtocolId());
        response.setTrialId(savedProtocol.getTrialId());
        response.setVersionNumber(savedProtocol.getVersionNumber());
        response.setInclusionCriteria(
                savedProtocol.getInclusionCriteria());
        response.setExclusionCriteria(
                savedProtocol.getExclusionCriteria());
        response.setEndpoints(savedProtocol.getEndpoints());
        response.setEffectiveDate(savedProtocol.getEffectiveDate() != null
                ? savedProtocol.getEffectiveDate().toString() : null);
        response.setStatus(savedProtocol.getStatus().name());
        response.setMessage("Protocol updated successfully");
        return response;
    }
}
