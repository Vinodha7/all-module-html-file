package com.cts.pharmaTrack.module.subjectEnrolment.repository;

import com.cts.pharmaTrack.module.subjectEnrolment.entity.AdverseEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdverseEventRepository extends JpaRepository<AdverseEvent, String> {

    List<AdverseEvent> findBySubjectId(Integer subjectId);

    boolean existsBySubjectId(Integer subjectId);

    boolean existsByVisitId(String visitId);
}
