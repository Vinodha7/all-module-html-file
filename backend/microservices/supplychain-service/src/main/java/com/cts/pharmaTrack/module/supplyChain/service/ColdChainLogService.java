package com.cts.pharmaTrack.module.supplyChain.service;

import com.cts.pharmaTrack.common.exception.BadRequestException;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.notification.NotificationPublisher;
import com.cts.pharmaTrack.module.supplyChain.dto.ColdChainLogRequestDTO;
import com.cts.pharmaTrack.module.supplyChain.entity.ColdChainLog;
import com.cts.pharmaTrack.module.supplyChain.entity.DrugShipment;
import com.cts.pharmaTrack.module.supplyChain.repository.ColdChainLogRepository;
import com.cts.pharmaTrack.module.supplyChain.repository.DrugShipmentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@Slf4j
public class ColdChainLogService {

    @Autowired
    private ColdChainLogRepository coldChainLogRepository;

    @Autowired
    private DrugShipmentRepository drugShipmentRepository;

    @Autowired
    private NotificationPublisher notificationPublisher;

    public ColdChainLog recordTemperatureLog(ColdChainLogRequestDTO dto) {
        log.info("Recording temperature log for shipmentId: {}",
            dto.getShipmentId());

        if (dto.getShipmentId() <= 0) {
            throw new BadRequestException(
                "ShipmentId must be greater than zero");
        }
        if (dto.getTemperature() == null) {
            throw new BadRequestException("Temperature is required");
        }

        DrugShipment shipment = drugShipmentRepository.findById(dto.getShipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Shipment not found with ID " + dto.getShipmentId()));

        if (shipment.getBatch() == null || shipment.getBatch().getProduct() == null) {
            throw new BadRequestException("Thresholds cannot be resolved: product is not linked to batch/shipment");
        }

        var product = shipment.getBatch().getProduct();
        BigDecimal minThreshold = BigDecimal.valueOf(product.getMinThreshold());
        BigDecimal maxThreshold = BigDecimal.valueOf(product.getMaxThreshold());

        boolean isExcursion =
            dto.getTemperature().compareTo(minThreshold) < 0
            || dto.getTemperature().compareTo(maxThreshold) > 0;

        log.info("Temperature: {}, Min: {}, Max: {}, Excursion: {}",
                dto.getTemperature(), minThreshold,
                maxThreshold, isExcursion);

        ColdChainLog coldChainLog = ColdChainLog.builder()
                .shipment(shipment)
                .recordedAt(LocalDateTime.now())
                .temperature(dto.getTemperature())
                .minThreshold(minThreshold)
                .maxThreshold(maxThreshold)
                .excursionFlag(isExcursion)
                .status(isExcursion ?
                    ColdChainLog.ColdChainStatus.Excursion :
                    ColdChainLog.ColdChainStatus.Normal)
                .build();

        ColdChainLog saved = coldChainLogRepository.save(coldChainLog);
        log.info("Temperature log recorded with ID: {}", saved.getLogId());
        notificationPublisher.notify(NotificationPublisher.COLD_CHAIN,
                "Cold chain log id " + saved.getLogId()
                        + " was recorded for shipment " + saved.getShipmentId());
        return saved;
    }

    public List<ColdChainLog> fetchAllLogs() {
        log.info("Fetching all temperature logs");
        List<ColdChainLog> logs = coldChainLogRepository.findAll();
        if (logs.isEmpty()) {
            throw new ResourceNotFoundException("No temperature logs found");
        }
        return logs;
    }

    public ColdChainLog fetchLogById(int logId) {
        log.info("Fetching temperature log by ID: {}", logId);
        return coldChainLogRepository.findById(logId)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "Temperature log not found with ID " + logId));
    }

    public List<ColdChainLog> fetchLogsByShipment(int shipmentId) {
        log.info("Fetching logs by shipmentId: {}", shipmentId);
        List<ColdChainLog> logs =
            coldChainLogRepository.findByShipmentShipmentId(shipmentId);
        if (logs.isEmpty()) {
            throw new ResourceNotFoundException(
                "No logs found for shipment " + shipmentId);
        }
        return logs;
    }

    public List<ColdChainLog> fetchExcursionLogs() {
        log.info("Fetching all excursion logs");
        List<ColdChainLog> logs =
            coldChainLogRepository.findByExcursionFlagTrue();
        if (logs.isEmpty()) {
            throw new ResourceNotFoundException("No excursion logs found");
        }
        return logs;
    }
}