package com.cts.pharmaTrack.module.regulatoryAffairs.service;

import com.cts.pharmaTrack.common.exception.DuplicateResourceException;
import com.cts.pharmaTrack.common.exception.InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryDossierRequest;
import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryDossierResponse;
import com.cts.pharmaTrack.module.regulatoryAffairs.entity.RegulatoryDossier;
import com.cts.pharmaTrack.module.regulatoryAffairs.repository.RegulatoryDossierRepository;
import com.cts.pharmaTrack.module.regulatoryAffairs.repository.RegulatoryMilestoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * Business logic for regulatory dossiers: preparation, lookup, update and safe deletion.
 * The primary key {@code dossierId} is supplied by the client (e.g. {@code DOS001}).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RegulatoryDossierService {

    private static final Logger logger = LoggerFactory.getLogger(RegulatoryDossierService.class);
    private static final String DEFAULT_STATUS = "InPreparation";

    private final RegulatoryDossierRepository dossierRepository;
    private final RegulatoryMilestoneRepository milestoneRepository;
    private final NotificationPublisher notificationPublisher;

    public RegulatoryDossierResponse create(RegulatoryDossierRequest request) {
        logger.info("Executing create with dossierId: {}", request.getDossierId());
        if (dossierRepository.existsById(request.getDossierId())) {
            throw new DuplicateResourceException(
                    "dossierId already exists: " + request.getDossierId());
        }
        RegulatoryDossier dossier = new RegulatoryDossier();
        dossier.setDossierId(request.getDossierId());
        apply(dossier, request);
        dossier.setStatus(StringUtils.hasText(request.getStatus())
                ? request.getStatus() : DEFAULT_STATUS);
        RegulatoryDossier saved = dossierRepository.save(dossier);
        notificationPublisher.notify(NotificationPublisher.REGULATORY,
                "Regulatory dossier id " + saved.getDossierId() + " was created");
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RegulatoryDossierResponse> getAll() {
        logger.info("Executing getAll");
        List<RegulatoryDossier> dossiers = dossierRepository.findAll();
        if (dossiers.isEmpty()) {
            throw new ResourceNotFoundException("No regulatory dossiers found");
        }
        return dossiers.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RegulatoryDossierResponse getById(String dossierId) {
        logger.info("Executing getById with dossierId: {}", dossierId);
        return toResponse(findOrThrow(dossierId));
    }

    public RegulatoryDossierResponse update(RegulatoryDossierRequest request) {
        logger.info("Executing update with dossierId: {}", request.getDossierId());
        RegulatoryDossier dossier = findOrThrow(request.getDossierId());
        apply(dossier, request);
        if (StringUtils.hasText(request.getStatus())) {
            dossier.setStatus(request.getStatus());
        }
        RegulatoryDossier updated = dossierRepository.save(dossier);
        notificationPublisher.notify(NotificationPublisher.REGULATORY,
                "Regulatory dossier id " + updated.getDossierId() + " status changed to " + updated.getStatus());
        return toResponse(updated);
    }

    public void delete(String dossierId) {
        logger.info("Executing delete with dossierId: {}", dossierId);
        RegulatoryDossier dossier = findOrThrow(dossierId);
        if (milestoneRepository.existsByDossierId(dossierId)) {
            throw new InvalidStatusTransitionException(
                    "Cannot delete dossier with linked milestones: " + dossierId);
        }
        dossierRepository.delete(dossier);
    }

    private void apply(RegulatoryDossier dossier, RegulatoryDossierRequest request) {
        dossier.setProductId(request.getProductId());
        dossier.setSubmissionType(request.getSubmissionType());
        dossier.setTargetMarket(request.getTargetMarket());
        dossier.setSubmissionDate(request.getSubmissionDate());
        dossier.setAssignedOfficerId(request.getAssignedOfficerId());
    }

    private RegulatoryDossier findOrThrow(String dossierId) {
        return dossierRepository.findById(dossierId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryDossier", dossierId));
    }

    private RegulatoryDossierResponse toResponse(RegulatoryDossier d) {
        return new RegulatoryDossierResponse(
                d.getDossierId(),
                d.getProductId(),
                d.getSubmissionType(),
                d.getTargetMarket(),
                d.getSubmissionDate(),
                d.getAssignedOfficerId(),
                d.getStatus());
    }
}
