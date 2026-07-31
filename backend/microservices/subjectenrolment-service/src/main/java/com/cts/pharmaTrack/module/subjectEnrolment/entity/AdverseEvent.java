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
 * An adverse event logged against a {@link TrialSubject} during a {@link VisitRecord}.
 *
 * <p>Maps to the {@code adverse_event} table from the project SQL script.
 * {@code aeId} is a client-supplied string primary key (e.g. {@code AE001});
 * {@code subjectId} and {@code visitId} are the parent references.
 */
@Entity
@Table(name = "adverse_event")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdverseEvent {

    @Id
    @Column(name = "aeId", length = 20)
    private String aeId;

    @Column(name = "subjectId", nullable = false)
    private Integer subjectId;

    @Column(name = "visitId", nullable = false, length = 20)
    private String visitId;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "severity", length = 20)
    private String severity;

    @Column(name = "relatedness", length = 20)
    private String relatedness;

    @Column(name = "onsetDate")
    private LocalDate onsetDate;

    @Column(name = "resolutionDate")
    private LocalDate resolutionDate;

    @Column(name = "reportedById", length = 20)
    private String reportedById;

    @Column(name = "status", length = 20)
    private String status;
}
