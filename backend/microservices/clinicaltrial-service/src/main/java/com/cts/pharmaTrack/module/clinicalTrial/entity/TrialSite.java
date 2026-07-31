package com.cts.pharmaTrack.module.clinicalTrial.entity;

import com.cts.pharmaTrack.module.clinicalTrial.enums.SiteStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "trial_site")
@Data
@NoArgsConstructor
public class TrialSite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "trialSiteId")
    private int trialSiteId;

    @Column(name = "trialId", nullable = false)
    private int trialId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "siteId", nullable = false)
    private Site site;

    @Column(name = "principalInvestigatorId", nullable = false)
    private int principalInvestigatorId;

    @Column(name = "plannedSubjects", nullable = false)
    private int plannedSubjects;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SiteStatus status = SiteStatus.Active;

    public String getCountry() {
        return site != null ? site.getCountry() : null;
    }

    public String getSiteName() {
        return site != null ? site.getSiteName() : null;
    }

    public int getSiteId() {
        return site != null ? site.getSiteId() : 0;
    }

    public void setSiteId(int siteId) {
        Site s = new Site();
        s.setSiteId(siteId);
        this.site = s;
    }
}