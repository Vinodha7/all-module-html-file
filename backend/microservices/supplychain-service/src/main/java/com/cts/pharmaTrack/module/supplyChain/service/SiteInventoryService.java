package com.cts.pharmaTrack.module.supplyChain.service;

import com.cts.pharmaTrack.common.exception.BadRequestException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import com.cts.pharmaTrack.module.supplyChain.dto.SiteInventoryRequestDTO;
import com.cts.pharmaTrack.module.supplyChain.entity.SiteInventory;
import com.cts.pharmaTrack.module.supplyChain.repository.SiteInventoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class SiteInventoryService {

    @Autowired
    private SiteInventoryRepository siteInventoryRepository;

    @Autowired
    private NotificationPublisher notificationPublisher;

    public SiteInventory createInventory(SiteInventoryRequestDTO dto) {
        log.info("Creating inventory for siteId: {}, batchId: {}",
                dto.getSiteId(), dto.getBatchId());

        if (dto.getSiteId() <= 0) {
            throw new BadRequestException("SiteId must be greater than zero");
        }
        if (dto.getBatchId() <= 0) {
            throw new BadRequestException("BatchId must be greater than zero");
        }
        if (dto.getQuantityReceived() == null ||
                dto.getQuantityReceived().doubleValue() < 0) {
            throw new BadRequestException(
                "Quantity received must be zero or greater");
        }
        if (dto.getQuantityDispensed() == null ||
                dto.getQuantityDispensed().doubleValue() < 0) {
            throw new BadRequestException(
                "Quantity dispensed must be zero or greater");
        }
        if (dto.getQuantityDispensed()
                .compareTo(dto.getQuantityReceived()) > 0) {
            throw new BadRequestException(
                "Quantity dispensed cannot exceed quantity received");
        }

        SiteInventory inventory = SiteInventory.builder()
                .siteId(dto.getSiteId())
                .batchId(dto.getBatchId())
                .quantityReceived(dto.getQuantityReceived())
                .quantityDispensed(dto.getQuantityDispensed())
                .quantityOnHand(dto.getQuantityReceived()
                    .subtract(dto.getQuantityDispensed()))
                .storageCondition(dto.getStorageCondition())
                .lastUpdated(LocalDateTime.now())
                .build();

        SiteInventory saved = siteInventoryRepository.save(inventory);
        log.info("Inventory created with ID: {}", saved.getInventoryId());
        notificationPublisher.notify(NotificationPublisher.COLD_CHAIN,
                "Site inventory id " + saved.getInventoryId()
                        + " was created for site " + saved.getSiteId());
        return saved;
    }

    public List<SiteInventory> fetchAllInventory() {
        log.info("Fetching all inventory records");
        List<SiteInventory> inventories = siteInventoryRepository.findAll();
        if (inventories.isEmpty()) {
            throw new ResourceNotFoundException("No inventory records found");
        }
        return inventories;
    }

    public SiteInventory fetchInventoryById(int inventoryId) {
        log.info("Fetching inventory by ID: {}", inventoryId);
        return siteInventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Inventory not found with ID " + inventoryId));
    }

    public List<SiteInventory> fetchInventoryBySite(int siteId) {
        log.info("Fetching inventory by siteId: {}", siteId);
        List<SiteInventory> inventories =
            siteInventoryRepository.findBySiteId(siteId);
        if (inventories.isEmpty()) {
            throw new ResourceNotFoundException(
                "No inventory found for site " + siteId);
        }
        return inventories;
    }

    public List<SiteInventory> fetchInventoryByBatch(int batchId) {
        log.info("Fetching inventory by batchId: {}", batchId);
        List<SiteInventory> inventories =
            siteInventoryRepository.findByBatchId(batchId);
        if (inventories.isEmpty()) {
            throw new ResourceNotFoundException(
                "No inventory found for batch " + batchId);
        }
        return inventories;
    }

    public void updateReceivedQuantity(int inventoryId,
        SiteInventoryRequestDTO dto) {
    log.info("Updating received quantity for inventoryId: {}", inventoryId);

    SiteInventory inventory = siteInventoryRepository.findById(inventoryId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Inventory not found with ID " + inventoryId));

    if (dto.getQuantityReceived() == null ||
            dto.getQuantityReceived().doubleValue() <= 0) {
        throw new BadRequestException(
            "Quantity received must be greater than zero");
    }

    inventory.setQuantityReceived(
        inventory.getQuantityReceived().add(dto.getQuantityReceived()));
    inventory.setQuantityOnHand(
        inventory.getQuantityReceived().subtract(inventory.getQuantityDispensed()));
    inventory.setLastUpdated(LocalDateTime.now());

    siteInventoryRepository.save(inventory);
    log.info("Received quantity updated for inventoryId: {}", inventoryId);
    notificationPublisher.notify(NotificationPublisher.COLD_CHAIN,
            "Site inventory id " + inventory.getInventoryId()
                    + " received quantity was updated");
}

public void updateDispensedQuantity(int inventoryId,
        SiteInventoryRequestDTO dto) {
    log.info("Updating dispensed quantity for inventoryId: {}", inventoryId);

    SiteInventory inventory = siteInventoryRepository.findById(inventoryId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "Inventory not found with ID " + inventoryId));

    if (dto.getQuantityDispensed() == null ||
            dto.getQuantityDispensed().doubleValue() <= 0) {
        throw new BadRequestException(
            "Quantity dispensed must be greater than zero");
    }

    if (dto.getQuantityDispensed()
            .compareTo(inventory.getQuantityOnHand()) > 0) {
        throw new BadRequestException(
            "Quantity dispensed cannot exceed quantity on hand: " +
            inventory.getQuantityOnHand());
    }

    inventory.setQuantityDispensed(
        inventory.getQuantityDispensed().add(dto.getQuantityDispensed()));
    inventory.setQuantityOnHand(
        inventory.getQuantityReceived().subtract(inventory.getQuantityDispensed()));
    inventory.setLastUpdated(LocalDateTime.now());

    siteInventoryRepository.save(inventory);
    log.info("Dispensed quantity updated for inventoryId: {}", inventoryId);
    notificationPublisher.notify(NotificationPublisher.COLD_CHAIN,
            "Site inventory id " + inventory.getInventoryId()
                    + " dispensed quantity was updated");
}
}