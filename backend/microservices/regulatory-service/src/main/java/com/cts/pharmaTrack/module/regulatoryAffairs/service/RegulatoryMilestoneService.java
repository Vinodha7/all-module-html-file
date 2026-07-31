package com.cts.pharmaTrack.module.regulatoryAffairs.service;

import com.cts.pharmaTrack.common.exception.DuplicateResourceException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryMilestoneRequest;
import com.cts.pharmaTrack.module.regulatoryAffairs.dto.RegulatoryMilestoneResponse;
import com.cts.pharmaTrack.module.regulatoryAffairs.entity.RegulatoryMilestone;
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
 * Business logic for regulatory milestones tracked against a dossier.
 * The primary key {@code milestoneId} is supplied by the client (e.g. {@code MS001}).
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RegulatoryMilestoneService {

    private static final Logger logger = LoggerFactory.getLogger(RegulatoryMilestoneService.class);
    private static final String DEFAULT_STATUS = "Pending";

    private final RegulatoryMilestoneRepository milestoneRepository;
    private final RegulatoryDossierRepository dossierRepository;
    private final NotificationPublisher notificationPublisher;

    public RegulatoryMilestoneResponse create(RegulatoryMilestoneRequest request) {
        logger.info("Executing create with milestoneId: {}", request.getMilestoneId());
        if (milestoneRepository.existsById(request.getMilestoneId())) {
            throw new DuplicateResourceException(
                    "milestoneId already exists: " + request.getMilestoneId());
        }
        if (!dossierRepository.existsById(request.getDossierId())) {
            throw new ResourceNotFoundException("RegulatoryDossier", request.getDossierId());
        }
        RegulatoryMilestone milestone = new RegulatoryMilestone();
        milestone.setMilestoneId(request.getMilestoneId());
        apply(milestone, request);
        milestone.setStatus(StringUtils.hasText(request.getStatus())
                ? request.getStatus() : DEFAULT_STATUS);
        RegulatoryMilestone saved = milestoneRepository.save(milestone);
        notificationPublisher.notify(NotificationPublisher.REGULATORY,
                "Regulatory milestone id " + saved.getMilestoneId() + " (" + saved.getMilestoneType()
                        + ") was created for dossier " + saved.getDossierId());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<RegulatoryMilestoneResponse> getAll() {
        logger.info("Executing getAll");
        List<RegulatoryMilestone> milestones = milestoneRepository.findAll();
        if (milestones.isEmpty()) {
            throw new ResourceNotFoundException("No regulatory milestones found");
        }
        return milestones.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public RegulatoryMilestoneResponse getById(String milestoneId) {
        logger.info("Executing getById with milestoneId: {}", milestoneId);
        return toResponse(findOrThrow(milestoneId));
    }

    @Transactional(readOnly = true)
    public List<RegulatoryMilestoneResponse> getByDossier(String dossierId) {
        logger.info("Executing getByDossier with dossierId: {}", dossierId);
        return milestoneRepository.findByDossierId(dossierId)
                .stream().map(this::toResponse).toList();
    }

    public RegulatoryMilestoneResponse update(RegulatoryMilestoneRequest request) {
        logger.info("Executing update with milestoneId: {}", request.getMilestoneId());
        RegulatoryMilestone milestone = findOrThrow(request.getMilestoneId());
        if (!dossierRepository.existsById(request.getDossierId())) {
            throw new ResourceNotFoundException("RegulatoryDossier", request.getDossierId());
        }
        apply(milestone, request);
        if (StringUtils.hasText(request.getStatus())) {
            milestone.setStatus(request.getStatus());
        }
        RegulatoryMilestone updated = milestoneRepository.save(milestone);
        notificationPublisher.notify(NotificationPublisher.REGULATORY,
                "Regulatory milestone id " + updated.getMilestoneId() + " status changed to " + updated.getStatus());
        return toResponse(updated);
    }

    public void delete(String milestoneId) {
        logger.info("Executing delete with milestoneId: {}", milestoneId);
        RegulatoryMilestone milestone = findOrThrow(milestoneId);
        milestoneRepository.delete(milestone);
    }

    private void apply(RegulatoryMilestone milestone, RegulatoryMilestoneRequest request) {
        milestone.setDossierId(request.getDossierId());
        milestone.setMilestoneType(request.getMilestoneType());
        milestone.setMilestoneDate(request.getMilestoneDate());
        milestone.setNotes(request.getNotes());
    }

    private RegulatoryMilestone findOrThrow(String milestoneId) {
        return milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("RegulatoryMilestone", milestoneId));
    }

    private RegulatoryMilestoneResponse toResponse(RegulatoryMilestone m) {
        return new RegulatoryMilestoneResponse(
                m.getMilestoneId(),
                m.getDossierId(),
                m.getMilestoneType(),
                m.getMilestoneDate(),
                m.getNotes(),
                m.getStatus());
    }
}
