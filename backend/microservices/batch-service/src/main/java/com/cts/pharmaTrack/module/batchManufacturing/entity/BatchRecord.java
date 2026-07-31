package com.cts.pharmaTrack.module
    .batchManufacturing.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "batch_record")
public class BatchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "batchId")
    private int batchId;

    @Column(name = "productId", nullable = false)
    private int productId;

    @Column(name = "batchNumber",
            nullable = false, unique = true)
    private String batchNumber;

    @Column(name = "manufacturingDate",
            nullable = false)
    private LocalDate manufacturingDate;

    @Column(name = "expiryDate", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "quantityManufactured",
            nullable = false)
    private double quantityManufactured;

    @Column(name = "unit")
    private String unit;

    @Column(name = "manufacturingSiteId",
            nullable = false)
    private int manufacturingSiteId;

    @Column(name = "status")
    private String status = "IP";

    public int getBatchId() { return batchId; }
    public void setBatchId(int batchId) {
        this.batchId = batchId; }
    public int getProductId() { return productId; }
    public void setProductId(int productId) {
        this.productId = productId; }
    public String getBatchNumber() {
        return batchNumber; }
    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber; }
    public LocalDate getManufacturingDate() {
        return manufacturingDate; }
    public void setManufacturingDate(
            LocalDate manufacturingDate) {
        this.manufacturingDate = manufacturingDate; }
    public LocalDate getExpiryDate() {
        return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate; }
    public double getQuantityManufactured() {
        return quantityManufactured; }
    public void setQuantityManufactured(
            double quantityManufactured) {
        this.quantityManufactured =
            quantityManufactured; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) {
        this.unit = unit; }
    public int getManufacturingSiteId() {
        return manufacturingSiteId; }
    public void setManufacturingSiteId(
            int manufacturingSiteId) {
        this.manufacturingSiteId =
            manufacturingSiteId; }
    public String getStatus() { return status; }
    public void setStatus(String status) {
        this.status = status; }
}