package com.cts.pharmaTrack.module
    .batchManufacturing.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "raw_material_usage")
public class RawMaterialUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "usageId")
    private int usageId;

    @Column(name = "batchId", nullable = false)
    private int batchId;

    @Column(name = "materialName", nullable = false)
    private String materialName;

    @Column(name = "materialLotNumber",
            nullable = false)
    private String materialLotNumber;

    @Column(name = "quantityUsed", nullable = false)
    private double quantityUsed;

    @Column(name = "unit")
    private String unit;

    @Column(name = "status")
    private String status = "CON";

    public int getUsageId() { return usageId; }
    public void setUsageId(int usageId) {
        this.usageId = usageId; }
    public int getBatchId() { return batchId; }
    public void setBatchId(int batchId) {
        this.batchId = batchId; }
    public String getMaterialName() {
        return materialName; }
    public void setMaterialName(String materialName) {
        this.materialName = materialName; }
    public String getMaterialLotNumber() {
        return materialLotNumber; }
    public void setMaterialLotNumber(
            String materialLotNumber) {
        this.materialLotNumber = materialLotNumber; }
    public double getQuantityUsed() {
        return quantityUsed; }
    public void setQuantityUsed(double quantityUsed) {
        this.quantityUsed = quantityUsed; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) {
        this.unit = unit; }
    public String getStatus() { return status; }
    public void setStatus(String status) {
        this.status = status; }
}