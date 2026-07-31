package com.cts.pharmaTrack.module.subjectEnrolment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * A person enrolled into a clinical trial.
 *
 * <p>Maps to the {@code trial_subject} table as defined by the project SQL
 * script. The primary key {@code subjectId} is a client-supplied string
 * (e.g. {@code SUB001}); it is not auto-generated. Column names are kept as-is
 * (camelCase) to match the hand-written schema, so each field is annotated with
 * an explicit {@code @Column(name = ...)}.
 */
@Entity
@Table(name = "trial_subject")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TrialSubject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "subjectId")
    private Integer subjectId;

    @Column(name = "trialId", nullable = false)
    private Integer trialId;

    @Column(name = "siteId", nullable = false)
    private Integer siteId;

    @Column(name = "subjectCode", nullable = false, length = 50)
    private String subjectCode;

    @Column(name = "dateOfBirth")
    private LocalDate dateOfBirth;

    @Column(name = "gender", length = 10)
    private String gender;

    @Column(name = "consentDate")
    private LocalDate consentDate;

    @Column(name = "enrolmentDate")
    private LocalDate enrolmentDate;

    @Column(name = "status", length = 20)
    private String status;
}
