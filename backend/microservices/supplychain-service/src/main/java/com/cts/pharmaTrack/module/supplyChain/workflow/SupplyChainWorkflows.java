package com.cts.pharmaTrack.module.supplyChain.workflow;

import com.cts.pharmaTrack.common.audit.AuditModules;
import com.cts.pharmaTrack.common.exception.ResourceNotFoundException;
import com.cts.pharmaTrack.common.workflow.WorkflowDefinition;
import com.cts.pharmaTrack.common.workflow.WorkflowEntityHandler;
import com.cts.pharmaTrack.module.supplyChain.entity.DrugShipment;
import com.cts.pharmaTrack.module.supplyChain.repository.DrugShipmentRepository;
import org.springframework.stereotype.Component;

/**
 * Wave 4 workflow definitions + handlers for supplychain-service.
 *
 * <p>Only {@code DrugShipment} is workflow-managed. {@code ColdChainLog}'s status
 * ({@code Normal}/{@code Excursion}) is <em>derived</em> from the recorded
 * temperature (not a user-driven transition), and {@code SiteInventory} has no
 * status field — both are intentionally excluded.
 */
public final class SupplyChainWorkflows {

    private SupplyChainWorkflows() {
    }

    public static final WorkflowDefinition DRUG_SHIPMENT = WorkflowDefinition.forEntity("DrugShipment")
            .allow("Dispatched", "InTransit", "SHIP", "SupplyChain")
            .allow("InTransit", "Delivered", "DELIVER", "SupplyChain")
            .allow("InTransit", "Lost", "REPORT_LOST", "SupplyChain")
            .allow("InTransit", "Rejected", "REJECT", "SupplyChain")
            .build();

    @Component
    public static class DrugShipmentHandler implements WorkflowEntityHandler {
        private final DrugShipmentRepository repository;

        public DrugShipmentHandler(DrugShipmentRepository repository) {
            this.repository = repository;
        }

        public String entityType() { return "DrugShipment"; }
        public WorkflowDefinition definition() { return DRUG_SHIPMENT; }
        public String auditModule() { return AuditModules.SUPPLY_CHAIN; }

        public String currentStatus(String entityId) {
            return repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("DrugShipment not found: " + entityId))
                    .getStatus().name();
        }

        public void applyStatus(String entityId, String newStatus) {
            DrugShipment shipment = repository.findById(Integer.parseInt(entityId))
                    .orElseThrow(() -> new ResourceNotFoundException("DrugShipment not found: " + entityId));
            shipment.setStatus(DrugShipment.ShipmentStatus.valueOf(newStatus));
            repository.save(shipment);
        }
    }
}
