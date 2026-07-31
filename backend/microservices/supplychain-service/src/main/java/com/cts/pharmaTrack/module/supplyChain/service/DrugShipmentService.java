package com.cts.pharmaTrack.module.supplyChain.service;

import com.cts.pharmaTrack.common.exception.BadRequestException;
import com.cts.pharmaTrack.common.exception.InvalidStatusTransitionException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import com.cts.pharmaTrack.module.supplyChain.dto.DrugShipmentRequestDTO;
import com.cts.pharmaTrack.module.supplyChain.entity.DrugShipment;
import com.cts.pharmaTrack.module.supplyChain.entity.Site;
import com.cts.pharmaTrack.module.supplyChain.entity.BatchRecord;
import com.cts.pharmaTrack.module.supplyChain.repository.DrugShipmentRepository;
import com.cts.pharmaTrack.module.supplyChain.repository.SiteRepository;
import com.cts.pharmaTrack.module.supplyChain.repository.BatchRecordRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@Slf4j
public class DrugShipmentService {

    @Autowired
    private DrugShipmentRepository drugShipmentRepository;

    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("supplyChainBatchRecordRepository")
    private BatchRecordRepository batchRecordRepository;

    @Autowired
    @org.springframework.beans.factory.annotation.Qualifier("supplyChainSiteRepository")
    private SiteRepository siteRepository;

    @Autowired
    private NotificationPublisher notificationPublisher;

    public DrugShipment createShipment(DrugShipmentRequestDTO dto) {
        log.info("Creating new drug shipment for batchId: {}", dto.getBatchId());

        if (dto.getBatchId() <= 0) {
            throw new BadRequestException("BatchId must be greater than zero");
        }
        if (dto.getFromSiteId() <= 0) {
            throw new BadRequestException("FromSiteId must be greater than zero");
        }
        if (dto.getToSiteId() <= 0) {
            throw new BadRequestException("ToSiteId must be greater than zero");
        }
        if (dto.getShipmentDate() == null) {
            throw new BadRequestException("Shipment date is required");
        }
        if (dto.getQuantityShipped() == null ||
                dto.getQuantityShipped().doubleValue() <= 0) {
            throw new BadRequestException(
                "Quantity shipped must be greater than zero");
        }
        if (dto.getUnit() == null || dto.getUnit().isEmpty()) {
            throw new BadRequestException("Unit is required");
        }
        if (dto.getCarrierName() == null || dto.getCarrierName().isEmpty()) {
            throw new BadRequestException("Carrier name is required");
        }

        List<String> validCarriers = List.of("DHL", "FedEx", "UPS", "ColdChainExpress");
        if (!validCarriers.contains(dto.getCarrierName())) {
            throw new BadRequestException("Invalid carrierName: " + dto.getCarrierName() + ". Must be one of: " + validCarriers);
        }

        BatchRecord batch = batchRecordRepository.findById(dto.getBatchId())
                .orElseThrow(() -> new ResourceNotFoundException("Batch not found with ID " + dto.getBatchId()));
        Site fromSite = siteRepository.findById(dto.getFromSiteId())
                .orElseThrow(() -> new ResourceNotFoundException("From site not found with ID " + dto.getFromSiteId()));
        Site toSite = siteRepository.findById(dto.getToSiteId())
                .orElseThrow(() -> new ResourceNotFoundException("To site not found with ID " + dto.getToSiteId()));

        if (batch.getQuantityManufactured() != null && dto.getQuantityShipped().doubleValue() > batch.getQuantityManufactured()) {
            throw new BadRequestException("Quantity shipped cannot exceed quantity manufactured (" + batch.getQuantityManufactured() + ")");
        }

        DrugShipment shipment = DrugShipment.builder()
                .batch(batch)
                .fromSite(fromSite)
                .toSite(toSite)
                .shipmentDate(dto.getShipmentDate())
                .quantityShipped(dto.getQuantityShipped())
                .unit(dto.getUnit())
                .carrierName(dto.getCarrierName())
                .status(DrugShipment.ShipmentStatus.Dispatched)
                .build();

        DrugShipment saved = drugShipmentRepository.save(shipment);
        log.info("Drug shipment created with ID: {}", saved.getShipmentId());
        notificationPublisher.notify(NotificationPublisher.COLD_CHAIN,
                "Drug shipment id " + saved.getShipmentId() + " was created");
        return saved;
    }

    public List<DrugShipment> fetchAllShipments() {
        log.info("Fetching all shipments");
        List<DrugShipment> shipments = drugShipmentRepository.findAll();
        if (shipments.isEmpty()) {
            throw new ResourceNotFoundException("No shipments found");
        }
        return shipments;
    }

    public DrugShipment fetchShipmentById(int shipmentId) {
        log.info("Fetching shipment by ID: {}", shipmentId);
        return drugShipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Shipment not found with ID " + shipmentId));
    }

    public List<DrugShipment> fetchShipmentsByBatch(int batchId) {
        log.info("Fetching shipments by batchId: {}", batchId);
        List<DrugShipment> shipments = drugShipmentRepository.findByBatchBatchId(batchId);
        if (shipments.isEmpty()) {
            throw new ResourceNotFoundException(
                "No shipments found for batch " + batchId);
        }
        return shipments;
    }

    public List<DrugShipment> fetchShipmentsBySite(int siteId) {
        log.info("Fetching shipments by siteId: {}", siteId);
        List<DrugShipment> shipments = drugShipmentRepository.findByToSiteSiteId(siteId);
        if (shipments.isEmpty()) {
            throw new ResourceNotFoundException(
                "No shipments found for site " + siteId);
        }
        return shipments;
    }

    public List<DrugShipment> fetchShipmentsByStatus(String status) {
        log.info("Fetching shipments by status: {}", status);
        try {
            DrugShipment.ShipmentStatus shipmentStatus =
                DrugShipment.ShipmentStatus.valueOf(status);
            List<DrugShipment> shipments =
                drugShipmentRepository.findByStatus(shipmentStatus);
            if (shipments.isEmpty()) {
                throw new ResourceNotFoundException(
                    "No shipments found with status " + status);
            }
            return shipments;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status value: " + status);
        }
    }

    public void updateShipment(int shipmentId, DrugShipmentRequestDTO dto) {
    log.info("Updating shipment with ID: {}", shipmentId);

    DrugShipment shipment = drugShipmentRepository.findById(shipmentId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Shipment not found with ID " + shipmentId));

    if (dto.getCarrierName() != null && !dto.getCarrierName().isEmpty()) {
        shipment.setCarrierName(dto.getCarrierName());
    }
    if (dto.getShipmentDate() != null) {
        shipment.setShipmentDate(dto.getShipmentDate());
    }
    if (dto.getQuantityShipped() != null &&
            dto.getQuantityShipped().doubleValue() > 0) {
        shipment.setQuantityShipped(dto.getQuantityShipped());
    }
    if (dto.getUnit() != null && !dto.getUnit().isEmpty()) {
        shipment.setUnit(dto.getUnit());
    }

    drugShipmentRepository.save(shipment);
    log.info("Shipment updated successfully with ID: {}", shipmentId);
    notificationPublisher.notify(NotificationPublisher.COLD_CHAIN,
            "Drug shipment id " + shipment.getShipmentId() + " was updated");
}

public void updateShipmentStatus(int shipmentId, String status) {
    log.info("Updating shipment status for ID: {}", shipmentId);

    DrugShipment shipment = drugShipmentRepository.findById(shipmentId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Shipment not found with ID " + shipmentId));

    DrugShipment.ShipmentStatus newStatus;
    try {
        newStatus = DrugShipment.ShipmentStatus.valueOf(status);
    } catch (IllegalArgumentException e) {
        throw new BadRequestException("Invalid status value: " + status +
            ". Allowed values: Dispatched, InTransit, Delivered, Lost, Rejected");
    }

    // Validate status transitions
    DrugShipment.ShipmentStatus currentStatus = shipment.getStatus();

    boolean validTransition =
        (currentStatus == DrugShipment.ShipmentStatus.Dispatched &&
            newStatus == DrugShipment.ShipmentStatus.InTransit) ||
        (currentStatus == DrugShipment.ShipmentStatus.InTransit &&
            newStatus == DrugShipment.ShipmentStatus.Delivered) ||
        (currentStatus == DrugShipment.ShipmentStatus.InTransit &&
            newStatus == DrugShipment.ShipmentStatus.Lost) ||
        (currentStatus == DrugShipment.ShipmentStatus.InTransit &&
            newStatus == DrugShipment.ShipmentStatus.Rejected);

    if (!validTransition) {
        throw new InvalidStatusTransitionException(
            "Status transition from " + currentStatus +
            " to " + newStatus + " is not allowed");
    }

    shipment.setStatus(newStatus);
    drugShipmentRepository.save(shipment);
    log.info("Shipment status updated to {} for ID: {}", newStatus, shipmentId);
    notificationPublisher.notify(NotificationPublisher.COLD_CHAIN,
            "Drug shipment id " + shipment.getShipmentId()
                    + " status changed to " + shipment.getStatus());
}
}