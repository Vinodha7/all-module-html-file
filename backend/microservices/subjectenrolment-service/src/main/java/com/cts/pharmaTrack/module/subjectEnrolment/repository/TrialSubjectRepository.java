package com.cts.pharmaTrack.module.subjectEnrolment.repository;

import com.cts.pharmaTrack.module.subjectEnrolment.entity.TrialSubject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TrialSubjectRepository extends JpaRepository<TrialSubject, Integer> {

    boolean existsBySubjectCode(String subjectCode);

    long countByTrialId(Integer trialId);
}
