package com.cts.pharmaTrack.module
    .batchManufacturing.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "qc_test")
public class QCTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "testId")
    private int testId;

    @Column(name = "batchId", nullable = false)
    private int batchId;

    @Column(name = "testType", nullable = false)
    private String testType;

    @Column(name = "testedById")
    private int testedById;

    @Column(name = "testDate", nullable = false)
    private LocalDate testDate;

    @Column(name = "result")
    private String result;

    @Column(name = "specification")
    private String specification;

    @Column(name = "status")
    private String status = "RT";

    public int getTestId() { return testId; }
    public void setTestId(int testId) {
        this.testId = testId; }
    public int getBatchId() { return batchId; }
    public void setBatchId(int batchId) {
        this.batchId = batchId; }
    public String getTestType() { return testType; }
    public void setTestType(String testType) {
        this.testType = testType; }
    public int getTestedById() { return testedById; }
    public void setTestedById(int testedById) {
        this.testedById = testedById; }
    public LocalDate getTestDate() { return testDate; }
    public void setTestDate(LocalDate testDate) {
        this.testDate = testDate; }
    public String getResult() { return result; }
    public void setResult(String result) {
        this.result = result; }
    public String getSpecification() {
        return specification; }
    public void setSpecification(
            String specification) {
        this.specification = specification; }
    public String getStatus() { return status; }
    public void setStatus(String status) {
        this.status = status; }
}