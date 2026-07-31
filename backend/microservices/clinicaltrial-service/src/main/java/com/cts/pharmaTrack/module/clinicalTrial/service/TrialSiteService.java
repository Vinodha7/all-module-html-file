package com.cts.pharmaTrack.module.clinicalTrial.service;

import com.cts.pharmaTrack.module.clinicalTrial.dto.request.TrialSiteRequestDTO;
import com.cts.pharmaTrack.module.clinicalTrial.dto.response.TrialSiteResponseDTO;
import com.cts.pharmaTrack.module.clinicalTrial.entity.ClinicalTrial;
import com.cts.pharmaTrack.module.clinicalTrial.entity.TrialSite;
import com.cts.pharmaTrack.module.clinicalTrial.enums.SiteStatus;
import com.cts.pharmaTrack.module.clinicalTrial.enums.TrialStatus;
import com.cts.pharmaTrack.module.clinicalTrial.exception.SiteNotFoundException;
import com.cts.pharmaTrack.module.clinicalTrial.exception.TrialNotFoundException;
import com.cts.pharmaTrack.module.clinicalTrial.repository.ClinicalTrialRepository;
import com.cts.pharmaTrack.module.clinicalTrial.repository.TrialSiteRepository;
import com.cts.pharmaTrack.module.clinicalTrial.repository.SiteRepository;
import com.cts.pharmaTrack.module.clinicalTrial.entity.Site;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class TrialSiteService {

    private static final Logger logger =
            LoggerFactory.getLogger(TrialSiteService.class);

    @Autowired
    private TrialSiteRepository trialSiteRepository;

    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("clinicalTrialSiteRepository")
    private SiteRepository siteRepository;

    @Autowired
    private ClinicalTrialRepository clinicalTrialRepository;

    @Autowired
    private NotificationPublisher notificationPublisher;

    // ── CREATE SITE ───────────────────────────────────────────────────────────

    public TrialSiteResponseDTO createSite(
            int trialId, TrialSiteRequestDTO request) {

        logger.info(
                "Request received to create site for trialId: {}",
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
                    "Cannot add site to Terminated trial: {}", trialId);
            throw new IllegalStateException(
                    "Cannot add site to a Terminated trial");
        }

        if (request.getSiteId() == null) {
            throw new IllegalArgumentException("Site ID is mandatory");
        }
        Site site = siteRepository.findById(request.getSiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Site not found with ID: " + request.getSiteId()));

        if (request.getPrincipalInvestigatorId() <= 0) {
            throw new IllegalArgumentException(
                    "Principal investigator ID is mandatory");
        }
        if (request.getPlannedSubjects() <= 0) {
            throw new IllegalArgumentException(
                    "Planned subjects must be greater than zero");
        }

        if (trialSiteRepository.existsByTrialIdAndSiteSiteId(
                trialId, request.getSiteId())) {
            logger.error(
                    "Site ID {} already exists for trialId: {}",
                    request.getSiteId(), trialId);
            throw new IllegalStateException(
                    "Site is already added to this trial");
        }

        TrialSite trialSite = new TrialSite();
        trialSite.setTrialId(trialId);
        trialSite.setSite(site);
        trialSite.setPrincipalInvestigatorId(
                request.getPrincipalInvestigatorId());
        trialSite.setPlannedSubjects(request.getPlannedSubjects());

        TrialSite savedSite = trialSiteRepository.save(trialSite);
        logger.info(
                "Site created successfully with siteId: {}",
                savedSite.getSiteId());

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Site " + savedSite.getSiteName()
                        + " (id " + savedSite.getSiteId()
                        + ") was created for trial " + trialId);

        return mapToResponseDTO(savedSite);
    }

    // ── GET ALL SITES ─────────────────────────────────────────────────────────

    public List<TrialSiteResponseDTO> getAllSites(int trialId) {
        logger.info(
                "Request received to get all sites for trialId: {}",
                trialId);
        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });
        List<TrialSite> sites =
                trialSiteRepository.findByTrialId(trialId);
        if (sites.isEmpty()) {
            logger.info("No sites found for trialId: {}", trialId);
            return Collections.emptyList();
        }
        logger.info("Fetched {} sites for trialId: {}",
                sites.size(), trialId);
        return sites.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // ── GET SITE BY ID ────────────────────────────────────────────────────────

    public TrialSiteResponseDTO getSiteById(int trialId, int trialSiteId) {
        logger.info(
                "Request received to get site with trialSiteId: {}" +
                " for trialId: {}", trialSiteId, trialId);
        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });
        TrialSite trialSite = trialSiteRepository
                .findById(trialSiteId)
                .orElseThrow(() -> {
                    logger.error(
                            "Site not found with trialSiteId: {}", trialSiteId);
                    return new SiteNotFoundException(trialSiteId);
                });
        logger.info("Site fetched successfully with trialSiteId: {}",
                trialSiteId);
        return mapToResponseDTO(trialSite);
    }

    // ── UPDATE SITE ───────────────────────────────────────────────────────────

    public TrialSiteResponseDTO updateSite(
            int trialId, int trialSiteId,
            TrialSiteRequestDTO request) {

        logger.info(
                "Request received to update site with trialSiteId: {}" +
                " for trialId: {}", trialSiteId, trialId);

        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });

        TrialSite trialSite = trialSiteRepository
                .findById(trialSiteId)
                .orElseThrow(() -> {
                    logger.error(
                            "Site not found with trialSiteId: {}", trialSiteId);
                    return new SiteNotFoundException(trialSiteId);
                });

        if (trialSite.getStatus() == SiteStatus.Closed) {
            logger.error(
                    "Site {} cannot be updated as status is Closed",
                    trialSiteId);
            throw new IllegalArgumentException(
                    "Site cannot be updated when status is Closed");
        }

        if (request.getSiteId() == null) {
            throw new IllegalArgumentException("Site ID is mandatory");
        }
        Site site = siteRepository.findById(request.getSiteId())
                .orElseThrow(() -> new ResourceNotFoundException("Site not found with ID: " + request.getSiteId()));

        if (request.getPrincipalInvestigatorId() <= 0) {
            throw new IllegalArgumentException(
                    "Principal investigator ID is mandatory");
        }
        if (request.getPlannedSubjects() <= 0) {
            throw new IllegalArgumentException(
                    "Planned subjects must be greater than zero");
        }

        trialSite.setSite(site);
        trialSite.setPrincipalInvestigatorId(
                request.getPrincipalInvestigatorId());
        trialSite.setPlannedSubjects(request.getPlannedSubjects());

        TrialSite updatedSite = trialSiteRepository.save(trialSite);
        logger.info(
                "Site updated successfully with siteId: {}", request.getSiteId());

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Site " + updatedSite.getSiteName()
                        + " (id " + updatedSite.getSiteId()
                        + ") was updated for trial " + trialId);

        return mapToResponseDTO(updatedSite);
    }

    // ── UPDATE SITE STATUS ────────────────────────────────────────────────────

    public TrialSiteResponseDTO updateSiteStatus(
            int trialId, int trialSiteId, String newStatus) {

        logger.info(
                "Request received to update status for trialSiteId: {}" +
                " trialId: {}", trialSiteId, trialId);

        clinicalTrialRepository
                .findById(trialId)
                .orElseThrow(() -> {
                    logger.error("Trial not found for trialId: {}",
                            trialId);
                    return new TrialNotFoundException(trialId);
                });

        TrialSite trialSite = trialSiteRepository
                .findById(trialSiteId)
                .orElseThrow(() -> {
                    logger.error(
                            "Site not found with trialSiteId: {}", trialSiteId);
                    return new SiteNotFoundException(trialSiteId);
                });

        SiteStatus currentStatus = trialSite.getStatus();
        SiteStatus requestedStatus;

        try {
            requestedStatus = SiteStatus.valueOf(newStatus);
        } catch (IllegalArgumentException e) {
            logger.error("Invalid status value: {}", newStatus);
            throw new IllegalArgumentException(
                    "Invalid status value: " + newStatus +
                    ". Allowed values are Active, OnHold, Closed");
        }

        validateSiteStatusTransition(currentStatus, requestedStatus);

        trialSite.setStatus(requestedStatus);
        TrialSite updatedSite = trialSiteRepository.save(trialSite);
        logger.info(
                "Site status updated to {} for siteId: {}",
                newStatus, updatedSite.getSiteId());

        notificationPublisher.notify(NotificationPublisher.TRIAL,
                "Site id " + updatedSite.getSiteId()
                        + " (trial " + trialId + ") status changed to "
                        + updatedSite.getStatus());

        return mapToResponseDTO(updatedSite);
    }

    // ── STATUS TRANSITION VALIDATOR ───────────────────────────────────────────

    private void validateSiteStatusTransition(
            SiteStatus current, SiteStatus next) {

        boolean valid = false;

        switch (current) {
            case Active:
                valid = next == SiteStatus.OnHold
                        || next == SiteStatus.Closed;
                break;
            case OnHold:
                valid = next == SiteStatus.Active
                        || next == SiteStatus.Closed;
                break;
            case Closed:
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

    public TrialSiteResponseDTO getByTrialAndSite(int trialId, int siteId) {
        logger.info("Fetching trial site for trialId: {} and siteId: {}", trialId, siteId);
        TrialSite trialSite = trialSiteRepository.findByTrialIdAndSiteSiteId(trialId, siteId)
                .orElseThrow(() -> new ResourceNotFoundException("TrialSite not found for trial " + trialId + " and site " + siteId));
        return mapToResponseDTO(trialSite);
    }

    // ── MAPPER ────────────────────────────────────────────────────────────────

    private TrialSiteResponseDTO mapToResponseDTO(TrialSite savedSite) {
        TrialSiteResponseDTO response = new TrialSiteResponseDTO();
        response.setTrialSiteId(savedSite.getTrialSiteId());
        response.setSiteId(savedSite.getSite() != null ? savedSite.getSite().getSiteId() : null);
        response.setTrialId(savedSite.getTrialId());
        response.setSiteName(savedSite.getSiteName());
        response.setCountry(savedSite.getCountry());
        response.setPrincipalInvestigatorId(
                savedSite.getPrincipalInvestigatorId());
        response.setPlannedSubjects(savedSite.getPlannedSubjects());
        response.setStatus(savedSite.getStatus().name());
        response.setMessage("Site updated successfully");
        return response;
    }
}
