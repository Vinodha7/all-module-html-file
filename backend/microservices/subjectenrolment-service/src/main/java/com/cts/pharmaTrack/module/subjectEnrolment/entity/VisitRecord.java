package com.cts.pharmaTrack.module.subjectEnrolment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * A scheduled or completed visit for a {@link TrialSubject}.
 *
 * <p>Maps to the {@code visit_record} table from the project SQL script.
 * {@code visitId} is a client-supplied string primary key (e.g. {@code VIS001})
 * and {@code subjectId} references the parent subject.
 */
@Entity
@Table(name = "visit_record")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class VisitRecord {

    @Id
    @Column(name = "visitId", length = 20)
    private String visitId;

    @Column(name = "subjectId", nullable = false)
    private Integer subjectId;

    @Column(name = "visitType", length = 20)
    private String visitType;

    @Column(name = "scheduledDate")
    private LocalDate scheduledDate;

    @Column(name = "actualDate")
    private LocalDate actualDate;

    @Column(name = "conductedById", length = 20)
    private String conductedById;

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    @Column(name = "sampleCollected")
    private Boolean sampleCollected;

    @Column(name = "sampleTypes", length = 255)
    private String sampleTypes;

    @Column(name = "status", length = 20)
    private String status;
}
