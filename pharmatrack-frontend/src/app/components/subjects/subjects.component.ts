import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-trial-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ══════════ LIST VIEW (tabs) ══════════ -->
    <div *ngIf="!selectedSubject()">
      <div class="page-head">
        <div>
          <h1 class="page-title">Subject Enrolment</h1>
          <div class="page-sub">Subjects, visits and adverse events across trials</div>
        </div>
        <div class="tooltip-wrap">
          <button class="btn btn-primary" (click)="openCreateForActiveTab()" [attr.aria-label]="createTip()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>{{ createLabel() }}</span>
          </button>
          <span class="tooltip-bubble">{{ createTip() }}</span>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- TABS -->
      <div class="tabs">
        <button class="tab" [class.active]="tab() === 'subjects'" (click)="tab.set('subjects')">Subjects</button>
        <button class="tab" [class.active]="tab() === 'visits'" (click)="tab.set('visits')">Visits</button>
        <button class="tab" [class.active]="tab() === 'events'" (click)="tab.set('events')">Adverse Events</button>
      </div>

      <!-- ─── SUBJECTS PANEL ─── -->
      <section *ngIf="tab() === 'subjects'">
        <div class="kpi-grid">
          <div class="kpi-card tone-neutral"><div class="kpi-top"><div class="kpi-label">Total Subjects</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div></div><div class="kpi-value">{{ subjects().length }}</div></div>
          <div class="kpi-card tone-accent"><div class="kpi-top"><div class="kpi-label">Enrolled</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg></div></div><div class="kpi-value">{{ subjCount('Enrolled') }}</div></div>
          <div class="kpi-card tone-blue"><div class="kpi-top"><div class="kpi-label">Active</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg></div></div><div class="kpi-value">{{ subjCount('Active') }}</div></div>
          <div class="kpi-card tone-danger"><div class="kpi-top"><div class="kpi-label">Withdrawn</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></div></div><div class="kpi-value">{{ subjCount('Withdrawn') }}</div></div>
        </div>

        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search subject code or ID" [(ngModel)]="subjSearch">
          </div>
          <div class="filter-select">
            <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="subjStatus" aria-label="Filter by Status">
              <option value="All statuses">All statuses</option>
              <option>Screening</option><option>Enrolled</option><option>Active</option><option>Completed</option><option>Withdrawn</option><option>Discontinued</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <div class="table-card">
          <div class="table-card-head"><h3>Subjects <span class="count">· {{ filteredSubjects().length }} total</span></h3></div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Subject Code</th><th>Subject ID</th><th>Trial</th><th>Site</th><th>Gender</th><th>Status</th><th style="text-align:center;">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of filteredSubjects()">
                  <td class="name-cell">{{ s.subjectCode }}</td>
                  <td class="mono">{{ s.subjectId }}</td>
                  <td>{{ trialCode(s.trialId) }}</td>
                  <td>{{ siteName(s.siteId) }}</td>
                  <td>{{ s.gender || '—' }}</td>
                  <td><span class="badge-status" [ngClass]="subjBadge(s.status)">{{ s.status }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleMenu('sub-' + s.subjectId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'sub-' + s.subjectId">
                        <button type="button" class="dropdown-item" (click)="viewSubject(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" (click)="openEditSubject(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredSubjects().length === 0"><td colspan="7"><div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><strong>No subjects yet</strong>Enrol your first subject to get started.</div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer"><div>{{ filteredSubjects().length }} record{{ filteredSubjects().length === 1 ? '' : 's' }}</div><div><span>Sorted ascending by Subject Code</span></div></div>
        </div>
      </section>

      <!-- ─── VISITS PANEL ─── -->
      <section *ngIf="tab() === 'visits'">
        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search visit ID or subject ID" [(ngModel)]="visitSearch">
          </div>
          <div class="filter-select">
            <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="visitStatus" aria-label="Filter by Status">
              <option value="All statuses">All statuses</option>
              <option>Scheduled</option><option>Completed</option><option>Missed</option><option>Rescheduled</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <div class="table-card">
          <div class="table-card-head"><h3>Visits <span class="count">· {{ filteredVisits().length }} total</span></h3></div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Visit ID</th><th>Subject ID</th><th>Visit Type</th><th>Scheduled Date</th><th>Status</th><th style="text-align:center;">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let v of filteredVisits()">
                  <td class="name-cell">{{ v.visitId }}</td>
                  <td class="mono">{{ v.subjectId }}</td>
                  <td>{{ v.visitType || '—' }}</td>
                  <td>{{ v.scheduledDate || '—' }}</td>
                  <td><span class="badge-status" [ngClass]="visitBadge(v.status)">{{ v.status }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleMenu('vis-' + v.visitId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'vis-' + v.visitId">
                        <button type="button" class="dropdown-item" (click)="viewVisit(v)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" (click)="openEditVisit(v)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredVisits().length === 0"><td colspan="6"><div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg><strong>No visits yet</strong>Log a visit to get started.</div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer"><div>{{ filteredVisits().length }} record{{ filteredVisits().length === 1 ? '' : 's' }}</div><div><span>Sorted ascending by Visit ID</span></div></div>
        </div>
      </section>

      <!-- ─── ADVERSE EVENTS PANEL ─── -->
      <section *ngIf="tab() === 'events'">
        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search AE ID or subject ID" [(ngModel)]="aeSearch">
          </div>
          <div class="filter-select">
            <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="aeSev" aria-label="Filter by Severity">
              <option value="All severities">All severities</option>
              <option>Mild</option><option>Moderate</option><option>Severe</option><option>LifeThreatening</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
        <div class="table-card">
          <div class="table-card-head"><h3>Adverse Events <span class="count">· {{ filteredEvents().length }} total</span></h3></div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>AE ID</th><th>Subject ID</th><th>Visit ID</th><th>Severity</th><th>Status</th><th>Onset Date</th><th style="text-align:center;">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let e of filteredEvents()">
                  <td class="name-cell">{{ e.aeId }}</td>
                  <td class="mono">{{ e.subjectId }}</td>
                  <td class="mono">{{ e.visitId || '—' }}</td>
                  <td><span class="badge-status" [ngClass]="sevBadge(e.severity)">{{ e.severity }}</span></td>
                  <td><span class="badge-status" [ngClass]="aeStatusBadge(e.status)">{{ e.status }}</span></td>
                  <td>{{ e.onsetDate || '—' }}</td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleMenu('ae-' + e.aeId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'ae-' + e.aeId">
                        <button type="button" class="dropdown-item" (click)="viewEvent(e)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" (click)="openEditEvent(e)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredEvents().length === 0"><td colspan="7"><div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg><strong>No adverse events yet</strong>Report an event to get started.</div></td></tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer"><div>{{ filteredEvents().length }} record{{ filteredEvents().length === 1 ? '' : 's' }}</div><div><span>Sorted ascending by AE ID</span></div></div>
        </div>
      </section>
    </div>

    <!-- ══════════ SUBJECT DETAIL VIEW ══════════ -->
    <div *ngIf="selectedSubject() as s">
      <div class="breadcrumb"><a (click)="closeDetail()">Subjects</a> / <strong>{{ s.subjectCode }} ({{ s.subjectId }})</strong></div>
      <div class="view-card">
        <h1 class="page-title">{{ s.subjectCode }}</h1>
        <div class="page-sub">Subject {{ s.subjectId }} · Trial {{ trialCode(s.trialId) }} · Site {{ siteName(s.siteId) }}</div>

        <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

        <div class="status-row">
          <div class="detail-field"><label>Status</label><span class="badge-status" [ngClass]="subjBadge(s.status)">{{ s.status }}</span></div>
          <div class="detail-field"><label>Subject ID</label><div class="value">{{ s.subjectId }}</div></div>
          <div class="detail-field"><label>Trial</label><div class="value">{{ trialCode(s.trialId) }}</div></div>
          <div class="detail-field"><label>Site</label><div class="value">{{ siteName(s.siteId) }}</div></div>
          <div class="detail-field"><label>Gender</label><div class="value">{{ s.gender || '—' }}</div></div>
          <div class="detail-field"><label>Date of Birth</label><div class="value">{{ s.dateOfBirth || '—' }}</div></div>
          <div class="detail-field"><label>Consent Date</label><div class="value">{{ s.consentDate || '—' }}</div></div>
          <div class="detail-field"><label>Enrolment Date</label><div class="value">{{ s.enrolmentDate || '—' }}</div></div>
          <div class="status-action-btns">
            <button class="status-action-btn" (click)="openEditSubject(s)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit Subject</button>
          </div>
        </div>

        <div class="section-cols">
          <!-- Visits -->
          <div class="section-block">
            <div class="section-head">
              <h3>Visits</h3>
              <div class="tooltip-wrap"><button class="btn btn-primary btn-sm" (click)="openCreateVisit(s.subjectId)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Visit</button><span class="tooltip-bubble">Log Visit</span></div>
            </div>
            <div class="section-box">
              <table class="mini-table">
                <thead><tr><th>Visit ID</th><th>Type</th><th>Scheduled</th><th>Status</th><th class="actions-cell">Actions</th></tr></thead>
                <tbody>
                  <tr *ngFor="let v of detailVisits()">
                    <td class="name-cell">{{ v.visitId }}</td>
                    <td>{{ v.visitType || '—' }}</td>
                    <td>{{ v.scheduledDate || '—' }}</td>
                    <td><span class="badge-status" [ngClass]="visitBadge(v.status)">{{ v.status }}</span></td>
                    <td class="actions-cell">
                      <div class="dropdown">
                        <button class="icon-menu-btn" (click)="toggleMenu('dv-' + v.visitId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                        <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'dv-' + v.visitId">
                          <button type="button" class="dropdown-item" (click)="viewVisit(v)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                          <button type="button" class="dropdown-item" (click)="openEditVisit(v)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="detailVisits().length === 0"><td colspan="5" style="padding:28px;text-align:center;color:var(--text-dim);">No visits logged for this subject yet.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Adverse Events -->
          <div class="section-block">
            <div class="section-head">
              <h3>Adverse Events</h3>
              <div class="tooltip-wrap"><button class="btn btn-primary btn-sm" (click)="openCreateEvent(s.subjectId)"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Event</button><span class="tooltip-bubble">Report Event</span></div>
            </div>
            <div class="section-box">
              <table class="mini-table">
                <thead><tr><th>AE ID</th><th>Visit ID</th><th>Severity</th><th>Status</th><th>Onset</th><th class="actions-cell">Actions</th></tr></thead>
                <tbody>
                  <tr *ngFor="let e of detailEvents()">
                    <td class="name-cell">{{ e.aeId }}</td>
                    <td class="mono">{{ e.visitId || '—' }}</td>
                    <td><span class="badge-status" [ngClass]="sevBadge(e.severity)">{{ e.severity }}</span></td>
                    <td><span class="badge-status" [ngClass]="aeStatusBadge(e.status)">{{ e.status }}</span></td>
                    <td>{{ e.onsetDate || '—' }}</td>
                    <td class="actions-cell">
                      <div class="dropdown">
                        <button class="icon-menu-btn" (click)="toggleMenu('de-' + e.aeId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                        <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'de-' + e.aeId">
                          <button type="button" class="dropdown-item" (click)="viewEvent(e)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                          <button type="button" class="dropdown-item" (click)="openEditEvent(e)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="detailEvents().length === 0"><td colspan="6" style="padding:28px;text-align:center;color:var(--text-dim);">No adverse events reported for this subject yet.</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ ENROL / EDIT SUBJECT MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="showSubjectModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showSubjectModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>{{ subjEditing ? 'Edit Subject' : 'Enrol Subject' }}</h2>
        <div class="modal-sub">Register a subject against a trial and site</div>
        <form (ngSubmit)="saveSubject()">
          <div class="form-grid">
            <div class="field"><label>Subject ID<span class="req">*</span></label><input type="text" [value]="subjEditing ? subjForm.subjectId : 'Auto-generated'" readonly><div class="hint">Auto-generated</div></div>
            <div class="field"><label>Subject Code<span class="req">*</span></label><input type="text" name="subjectCode" [(ngModel)]="subjForm.subjectCode" placeholder="e.g. S-001" required></div>
            <div class="field"><label>Trial<span class="req">*</span></label>
              <select name="trialId" [(ngModel)]="subjForm.trialId" required>
                <option [ngValue]="null">Select…</option>
                <option *ngFor="let t of trials()" [ngValue]="t.trialId">{{ t.trialCode || ('Trial ' + t.trialId) }}</option>
              </select>
            </div>
            <div class="field"><label>Site<span class="req">*</span></label>
              <select name="siteId" [(ngModel)]="subjForm.siteId" required>
                <option [ngValue]="null">Select…</option>
                <option *ngFor="let st of sites()" [ngValue]="st.siteId">{{ st.siteName || ('Site ' + st.siteId) }}</option>
              </select>
            </div>
            <div class="field"><label>Gender</label>
              <select name="gender" [(ngModel)]="subjForm.gender"><option value="">—</option><option>Male</option><option>Female</option><option>Other</option></select>
            </div>
            <div class="field"><label>Status<span class="req">*</span></label>
              <select name="status" [(ngModel)]="subjForm.status" required><option>Screening</option><option>Enrolled</option><option>Active</option><option>Completed</option><option>Withdrawn</option><option>Discontinued</option></select>
            </div>
            <div class="field"><label>Date of Birth</label><input type="date" name="dob" [(ngModel)]="subjForm.dateOfBirth"></div>
            <div class="field"><label>Consent Date</label><input type="date" name="consent" [(ngModel)]="subjForm.consentDate"></div>
            <div class="field"><label>Enrolment Date</label><input type="date" name="enrol" [(ngModel)]="subjForm.enrolmentDate"><div class="hint">Auto-filled with today</div></div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ LOG / EDIT VISIT MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="showVisitModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showVisitModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>{{ visitEditing ? 'Edit Visit' : 'Log Visit' }}</h2>
        <div class="modal-sub">Record a scheduled or completed subject visit</div>
        <form (ngSubmit)="saveVisit()">
          <div class="form-grid">
            <div class="field"><label>Visit ID<span class="req">*</span></label><input type="text" [value]="visitForm.visitId" readonly><div class="hint">Auto-generated</div></div>
            <div class="field"><label>Subject<span class="req">*</span></label>
              <select name="vSubject" [(ngModel)]="visitForm.subjectId" [disabled]="visitEditing || visitSubjectLocked" required>
                <option [ngValue]="null">Select…</option>
                <option *ngFor="let s of subjects()" [ngValue]="s.subjectId">{{ s.subjectCode }} ({{ s.subjectId }})</option>
              </select>
            </div>
            <div class="field"><label>Visit Type</label>
              <select name="vType" [(ngModel)]="visitForm.visitType"><option value="">—</option><option>Screening</option><option>Baseline</option><option>Follow-up</option><option>Unscheduled</option><option>End of Study</option></select>
            </div>
            <div class="field"><label>Status<span class="req">*</span></label>
              <select name="vStatus" [(ngModel)]="visitForm.status" required><option>Scheduled</option><option>Completed</option><option>Missed</option><option>Rescheduled</option></select>
            </div>
            <div class="field"><label>Scheduled Date</label><input type="date" name="vSched" [(ngModel)]="visitForm.scheduledDate"></div>
            <div class="field"><label>Actual Date</label><input type="date" name="vActual" [(ngModel)]="visitForm.actualDate"></div>
            <div class="field"><label>Sample Collected</label>
              <select name="vSample" [(ngModel)]="visitForm.sampleCollected"><option [ngValue]="false">No</option><option [ngValue]="true">Yes</option></select>
            </div>
            <div class="field" *ngIf="visitForm.sampleCollected"><label>Sample Types<span class="req">*</span></label>
              <div class="check-row">
                <label class="chk" *ngFor="let t of sampleTypeOptions"><input type="checkbox" [checked]="visitForm.sampleTypes.includes(t)" (change)="toggleSampleType(t, $event)"> {{ t }}</label>
              </div>
            </div>
            <div class="field full"><label>Observations</label><textarea name="vObs" [(ngModel)]="visitForm.observations" placeholder="Notes captured during the visit"></textarea></div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ VIEW VISIT MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="viewVisitData()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="viewVisitData.set(null)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Visit Details</h2>
        <div class="detail-grid" *ngIf="viewVisitData() as v">
          <div class="detail-field"><label>Visit ID</label><div class="value">{{ v.visitId }}</div></div>
          <div class="detail-field"><label>Subject ID</label><div class="value">{{ v.subjectId }}</div></div>
          <div class="detail-field"><label>Visit Type</label><div class="value">{{ v.visitType || '—' }}</div></div>
          <div class="detail-field"><label>Status</label><span class="badge-status" [ngClass]="visitBadge(v.status)">{{ v.status }}</span></div>
          <div class="detail-field"><label>Scheduled Date</label><div class="value">{{ v.scheduledDate || '—' }}</div></div>
          <div class="detail-field"><label>Actual Date</label><div class="value">{{ v.actualDate || '—' }}</div></div>
          <div class="detail-field"><label>Conducted By ID</label><div class="value">{{ v.conductedById || '—' }}</div></div>
          <div class="detail-field"><label>Sample Collected</label><div class="value">{{ v.sampleCollected ? ('Yes' + (v.sampleTypes && v.sampleTypes.length ? ' · ' + v.sampleTypes.join(', ') : '')) : 'No' }}</div></div>
        </div>
        <div class="detail-field" style="margin-top:18px;" *ngIf="viewVisitData() as v"><label>Observations</label><div class="value dim">{{ v.observations || '—' }}</div></div>
      </div>
    </div>

    <!-- ══════════ REPORT / EDIT EVENT MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="showEventModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showEventModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>{{ eventEditing ? 'Edit Event' : 'Report Event' }}</h2>
        <div class="modal-sub">Record an adverse event for a subject</div>
        <form (ngSubmit)="saveEvent()">
          <div class="form-grid">
            <div class="field"><label>AE ID<span class="req">*</span></label><input type="text" [value]="eventForm.aeId" readonly><div class="hint">Auto-generated</div></div>
            <div class="field"><label>Subject<span class="req">*</span></label>
              <select name="aSubject" [(ngModel)]="eventForm.subjectId" [disabled]="eventEditing || eventSubjectLocked" required (ngModelChange)="onEventSubjectChange()">
                <option [ngValue]="null">Select…</option>
                <option *ngFor="let s of subjects()" [ngValue]="s.subjectId">{{ s.subjectCode }} ({{ s.subjectId }})</option>
              </select>
            </div>
            <div class="field"><label>Visit ID<span class="req">*</span></label>
              <select name="aVisit" [(ngModel)]="eventForm.visitId" required>
                <option value="">Select…</option>
                <option *ngFor="let v of eventVisitOptions()" [value]="v.visitId">{{ v.visitId }}{{ v.visitType ? ' (' + v.visitType + ')' : '' }}</option>
              </select>
            </div>
            <div class="field"><label>Severity<span class="req">*</span></label>
              <select name="aSev" [(ngModel)]="eventForm.severity" required><option value="">—</option><option>Mild</option><option>Moderate</option><option>Severe</option><option>LifeThreatening</option></select>
            </div>
            <div class="field"><label>Relatedness</label>
              <select name="aRel" [(ngModel)]="eventForm.relatedness"><option value="">—</option><option>Unrelated</option><option>Possible</option><option>Probable</option><option>Definite</option></select>
            </div>
            <div class="field"><label>Status<span class="req">*</span></label>
              <select name="aStatus" [(ngModel)]="eventForm.status" required><option>Open</option><option>Under Review</option><option>Closed</option></select>
            </div>
            <div class="field"><label>Onset Date</label><input type="date" name="aOnset" [(ngModel)]="eventForm.onsetDate"></div>
            <div class="field"><label>Resolution Date</label><input type="date" name="aRes" [(ngModel)]="eventForm.resolutionDate"></div>
            <div class="field full"><label>Description</label><textarea name="aDesc" [(ngModel)]="eventForm.description" placeholder="Describe the adverse event"></textarea></div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ VIEW EVENT MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="viewEventData()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="viewEventData.set(null)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Adverse Event Details</h2>
        <div class="detail-grid" *ngIf="viewEventData() as e">
          <div class="detail-field"><label>AE ID</label><div class="value">{{ e.aeId }}</div></div>
          <div class="detail-field"><label>Subject ID</label><div class="value">{{ e.subjectId }}</div></div>
          <div class="detail-field"><label>Visit ID</label><div class="value">{{ e.visitId || '—' }}</div></div>
          <div class="detail-field"><label>Severity</label><span class="badge-status" [ngClass]="sevBadge(e.severity)">{{ e.severity }}</span></div>
          <div class="detail-field"><label>Relatedness</label><div class="value">{{ e.relatedness || '—' }}</div></div>
          <div class="detail-field"><label>Status</label><span class="badge-status" [ngClass]="aeStatusBadge(e.status)">{{ e.status }}</span></div>
          <div class="detail-field"><label>Onset Date</label><div class="value">{{ e.onsetDate || '—' }}</div></div>
          <div class="detail-field"><label>Resolution Date</label><div class="value">{{ e.resolutionDate || '—' }}</div></div>
          <div class="detail-field"><label>Reported By ID</label><div class="value">{{ e.reportedById || '—' }}</div></div>
        </div>
        <div class="detail-field" style="margin-top:18px;" *ngIf="viewEventData() as e"><label>Description</label><div class="value dim">{{ e.description || '—' }}</div></div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;}
    .badge-status{display:inline-block;padding:5px 12px;border-radius:20px;font-size:12.5px;font-weight:700;white-space:nowrap;}
    .badge-active{background:var(--accent-light);color:var(--accent-dark);}
    .badge-draft{background:#eef0ef;color:#3c463f;}
    .badge-suspended{background:var(--warning-light);color:var(--warning);}
    .badge-progress{background:var(--warning-light);color:var(--warning);}
    .badge-completed{background:var(--blue-light);color:var(--blue);}
    .badge-approved{background:#e6f4ec;color:#2f7d4f;}
    .badge-terminated{background:var(--danger-light);color:var(--danger);}
    .tabs{display:flex;gap:30px;margin-bottom:24px;border-bottom:1px solid var(--border);}
    .tab{appearance:none;border:none;background:none;font-family:inherit;font-size:14.5px;font-weight:600;color:var(--text-dim);padding:10px 2px;cursor:pointer;position:relative;top:1px;border-bottom:2px solid transparent;}
    .tab:hover{color:var(--text);}
    .tab.active{color:var(--text);border-bottom:2px solid var(--text);}
    .tooltip-wrap{position:relative;display:inline-flex;}
    .tooltip-wrap .tooltip-bubble{position:absolute;bottom:calc(100% + 10px);right:0;background:var(--text);color:#fff;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .15s ease, transform .15s ease;z-index:40;}
    .tooltip-wrap .tooltip-bubble::after{content:'';position:absolute;top:100%;right:14px;border:6px solid transparent;border-top-color:var(--text);}
    .tooltip-wrap:hover .tooltip-bubble{opacity:1;transform:translateY(0);}
    .actions-cell{text-align:center;}
    .filter-select{position:relative;display:inline-flex;align-items:center;min-width:190px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;}
    .filter-select .funnel{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select .caret{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;width:100%;border:none;background:transparent;border-radius:var(--radius-sm);padding:11px 34px 11px 36px;font-size:14px;color:var(--text);font-family:inherit;cursor:pointer;}
    .filter-select select:focus{outline:none;}
    .empty-state{padding:48px 20px;text-align:center;color:var(--text-dim);font-size:14px;}
    .empty-state svg{display:block;margin:0 auto 12px;color:#c9beb4;}
    .empty-state strong{display:block;color:var(--text);font-size:15.5px;font-weight:700;margin-bottom:4px;}
    .breadcrumb a{color:var(--text-dim);text-decoration:none;cursor:pointer;}
    .breadcrumb a:hover{text-decoration:underline;}
    .breadcrumb strong{color:var(--text);font-weight:700;}
    .view-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:32px 36px;}
    .view-card .page-title{font-size:26px;}
    .status-row{display:flex;align-items:center;justify-content:space-between;gap:22px;flex-wrap:wrap;margin:24px 0 6px;padding:20px 26px;background:#fbfaf8;border:1px solid var(--border);border-radius:var(--radius-md);}
    .status-row .detail-field{flex:1 1 0;}
    .detail-field label{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--text-dim);text-transform:uppercase;margin-bottom:7px;}
    .detail-field .value{font-size:16px;font-weight:600;color:var(--text);}
    .detail-field .value.dim{color:var(--text-dim);font-weight:500;line-height:1.5;}
    .status-action-btns{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;}
    .status-action-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:20px;border:1px solid var(--border);background:#fff;font-size:12.5px;font-weight:700;color:var(--text-dim);cursor:pointer;font-family:inherit;}
    .status-action-btn:hover{background:#f4f6f5;color:var(--text);}
    .section-cols{display:grid;grid-template-columns:1fr 1fr;gap:24px;min-width:0;}
    .section-cols .section-block{margin-top:34px;min-width:0;}
    .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .section-head h3{margin:0;font-size:17px;font-weight:800;}
    .section-box{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}
    .mini-table{width:100%;border-collapse:collapse;table-layout:fixed;}
    .mini-table th{text-align:left;padding:10px 12px;font-size:10.5px;font-weight:700;letter-spacing:.05em;color:var(--text-dim);text-transform:uppercase;background:#fbfaf8;border-bottom:1px solid var(--border);}
    .mini-table td{padding:10px 12px;font-size:12.5px;border-bottom:1px solid var(--border);color:var(--text);word-break:break-word;}
    .mini-table tr:last-child td{border-bottom:none;}
    .mini-table td.actions-cell{text-align:center;width:52px;}
    .modal{max-height:92vh;overflow-y:auto;position:relative;padding:26px 30px;}
    .modal h2{margin:0 0 4px;font-size:20px;}
    .modal-sub{color:var(--text-dim);font-size:13.5px;margin:0 0 16px;}
    .hint{font-size:11px;color:var(--text-dim);margin-top:4px;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px;margin-bottom:6px;}
    .field label{display:block;font-size:13.5px;font-weight:700;margin-bottom:6px;}
    .field label .req{color:var(--danger);margin-left:2px;}
    .field input, .field select, .field textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:#fff;color:var(--text);}
    .field textarea{resize:vertical;min-height:64px;}
    .field input[readonly], .field select:disabled{background:#f4f6f5;color:var(--text-dim);}
    .field.full{grid-column:1 / -1;}
    .modal-footer{display:flex;justify-content:flex-end;margin-top:18px;}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 40px;margin-bottom:6px;}
    .check-row{display:flex;gap:16px;flex-wrap:wrap;padding-top:4px;}
    .chk{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:500;}
    .chk input{width:auto;}
    .btn-sm{padding:8px 14px;font-size:13px;}
    .alert{padding:11px 15px;border-radius:var(--radius-sm);margin-bottom:18px;font-size:13.5px;}
    .alert-error{background:var(--danger-light);color:var(--danger);border:1px solid #f5c2c0;}
    .alert-success{background:#e6f4ec;color:#2f7d4f;border:1px solid #c3e6d1;}
  `]
})
export class SubjectsComponent implements OnInit {
  private api = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  saving = signal<boolean>(false);

  tab = signal<'subjects' | 'visits' | 'events'>('subjects');
  openMenu = signal<string | null>(null);

  subjects = signal<any[]>([]);
  allVisits = signal<any[]>([]);
  allEvents = signal<any[]>([]);
  trials = signal<any[]>([]);
  sites = signal<any[]>([]);

  selectedSubject = signal<any | null>(null);
  detailVisits = signal<any[]>([]);
  detailEvents = signal<any[]>([]);

  // filters
  subjSearch = '';
  subjStatus = 'All statuses';
  visitSearch = '';
  visitStatus = 'All statuses';
  aeSearch = '';
  aeSev = 'All severities';

  // modal state
  showSubjectModal = signal<boolean>(false);
  showVisitModal = signal<boolean>(false);
  showEventModal = signal<boolean>(false);
  viewVisitData = signal<any | null>(null);
  viewEventData = signal<any | null>(null);
  subjEditing = false;
  visitEditing = false;
  eventEditing = false;
  visitSubjectLocked = false;
  eventSubjectLocked = false;

  subjForm: any = {};
  visitForm: any = {};
  eventForm: any = {};
  sampleTypeOptions = ['Blood', 'Saliva', 'Urine', 'Biopsy'];

  ngOnInit() {
    this.fetchTrials();
    this.fetchSites();
    this.fetchSubjects();
    this.fetchVisits();
    this.fetchEvents();
  }

  @HostListener('document:click')
  onDocClick() { this.openMenu.set(null); }
  toggleMenu(id: string, ev: Event) { ev.stopPropagation(); this.openMenu.set(this.openMenu() === id ? null : id); }

  createLabel() { return this.tab() === 'subjects' ? 'Subject' : this.tab() === 'visits' ? 'Visit' : 'Event'; }
  createTip() { return this.tab() === 'subjects' ? 'Enrol Subject' : this.tab() === 'visits' ? 'Log Visit' : 'Report Event'; }
  openCreateForActiveTab() {
    if (this.tab() === 'subjects') this.openCreateSubject();
    else if (this.tab() === 'visits') this.openCreateVisit(null);
    else this.openCreateEvent(null);
  }

  // ── data ──
  fetchSubjects() {
    this.api.getSubjects().subscribe({
      next: (data) => this.subjects.set((data || []).slice().sort((a, b) => String(a.subjectCode).localeCompare(String(b.subjectCode)))),
      error: () => this.subjects.set([])
    });
  }
  fetchVisits() {
    this.api.getAllVisits().subscribe({
      next: (data) => this.allVisits.set((data || []).slice().sort((a, b) => String(a.visitId).localeCompare(String(b.visitId)))),
      error: () => this.allVisits.set([])
    });
  }
  fetchEvents() {
    this.api.getAllAdverseEvents().subscribe({
      next: (data) => this.allEvents.set((data || []).slice().sort((a, b) => String(a.aeId).localeCompare(String(b.aeId)))),
      error: () => this.allEvents.set([])
    });
  }
  fetchTrials() { this.api.getAllTrials().subscribe({ next: (d) => this.trials.set(d || []), error: () => this.trials.set([]) }); }
  fetchSites() { this.api.getSites().subscribe({ next: (r: any) => { if (r && r.success) this.sites.set(r.data || []); }, error: () => this.sites.set([]) }); }

  trialCode(trialId: any): string { const t = this.trials().find(x => x.trialId === trialId); return t ? (t.trialCode || ('Trial ' + trialId)) : String(trialId ?? '—'); }
  siteName(siteId: any): string { const s = this.sites().find(x => x.siteId === siteId); return s ? (s.siteName || ('Site ' + siteId)) : String(siteId ?? '—'); }

  // ── kpis ──
  subjCount(status: string) { return this.subjects().filter(s => s.status === status).length; }

  // ── filters ──
  filteredSubjects() {
    const q = this.subjSearch.toLowerCase();
    return this.subjects().filter(s => {
      const okS = this.subjStatus === 'All statuses' || s.status === this.subjStatus;
      const okQ = !q || String(s.subjectCode).toLowerCase().includes(q) || String(s.subjectId).toLowerCase().includes(q);
      return okS && okQ;
    });
  }
  filteredVisits() {
    const q = this.visitSearch.toLowerCase();
    return this.allVisits().filter(v => {
      const okS = this.visitStatus === 'All statuses' || v.status === this.visitStatus;
      const okQ = !q || String(v.visitId).toLowerCase().includes(q) || String(v.subjectId).toLowerCase().includes(q);
      return okS && okQ;
    });
  }
  filteredEvents() {
    const q = this.aeSearch.toLowerCase();
    return this.allEvents().filter(e => {
      const okV = this.aeSev === 'All severities' || e.severity === this.aeSev;
      const okQ = !q || String(e.aeId).toLowerCase().includes(q) || String(e.subjectId).toLowerCase().includes(q);
      return okV && okQ;
    });
  }

  // ── badges ──
  subjBadge(status: string): string {
    switch (status) {
      case 'Enrolled': return 'badge-active';
      case 'Active': return 'badge-completed';
      case 'Completed': return 'badge-approved';
      case 'Withdrawn': return 'badge-terminated';
      case 'Discontinued': return 'badge-suspended';
      default: return 'badge-draft';
    }
  }
  visitBadge(status: string): string {
    switch (status) { case 'Completed': return 'badge-approved'; case 'Missed': return 'badge-terminated'; case 'Rescheduled': return 'badge-suspended'; default: return 'badge-draft'; }
  }
  sevBadge(sev: string): string {
    switch (sev) { case 'Moderate': return 'badge-suspended'; case 'Severe': return 'badge-progress'; case 'LifeThreatening': return 'badge-terminated'; default: return 'badge-draft'; }
  }
  aeStatusBadge(status: string): string {
    switch (status) { case 'Closed': return 'badge-approved'; case 'Under Review': return 'badge-progress'; default: return 'badge-suspended'; }
  }

  // ── id helpers ──
  private nextId(arr: any[], key: string, prefix: string, pad: number): string {
    let max = 0;
    (arr || []).forEach(x => { const n = parseInt(String(x[key]).replace(/\D/g, ''), 10); if (!isNaN(n) && n > max) max = n; });
    let num = String(max + 1); while (num.length < pad) num = '0' + num; return prefix + num;
  }
  private today(): string { return new Date().toISOString().substring(0, 10); }

  // ── detail ──
  viewSubject(s: any) {
    this.openMenu.set(null);
    this.selectedSubject.set(s);
    this.clearMsg();
    this.loadDetail(s.subjectId);
  }
  closeDetail() { this.selectedSubject.set(null); this.clearMsg(); }
  loadDetail(subjectId: number) {
    this.api.getVisitsBySubjectId(subjectId).subscribe({ next: (d) => this.detailVisits.set((d || []).slice().sort((a, b) => String(a.visitId).localeCompare(String(b.visitId)))), error: () => this.detailVisits.set([]) });
    this.api.getAdverseEventsBySubjectId(subjectId).subscribe({ next: (d) => this.detailEvents.set((d || []).slice().sort((a, b) => String(a.aeId).localeCompare(String(b.aeId)))), error: () => this.detailEvents.set([]) });
  }

  // ── subject create/edit ──
  openCreateSubject() {
    this.subjEditing = false;
    this.subjForm = { subjectCode: '', trialId: null, siteId: null, gender: '', status: 'Enrolled', dateOfBirth: '', consentDate: '', enrolmentDate: this.today() };
    this.clearMsg();
    this.showSubjectModal.set(true);
  }
  openEditSubject(s: any) {
    this.openMenu.set(null);
    this.subjEditing = true;
    this.subjForm = { subjectId: s.subjectId, subjectCode: s.subjectCode, trialId: s.trialId, siteId: s.siteId, gender: s.gender || '', status: s.status || 'Enrolled', dateOfBirth: s.dateOfBirth || '', consentDate: s.consentDate || '', enrolmentDate: s.enrolmentDate || '' };
    this.clearMsg();
    this.showSubjectModal.set(true);
  }
  saveSubject() {
    if (!this.subjForm.subjectCode || this.subjForm.trialId == null || this.subjForm.siteId == null) { this.showError('Subject Code, Trial and Site are required.'); return; }
    this.saving.set(true);
    const base = {
      subjectCode: this.subjForm.subjectCode,
      trialId: Number(this.subjForm.trialId),
      siteId: Number(this.subjForm.siteId),
      gender: this.subjForm.gender || null,
      status: this.subjForm.status,
      dateOfBirth: this.subjForm.dateOfBirth || null,
      consentDate: this.subjForm.consentDate || null,
      enrolmentDate: this.subjForm.enrolmentDate || null
    };
    const payload: any = this.subjEditing ? { ...base, subjectId: this.subjForm.subjectId } : base;
    const req = this.subjEditing ? this.api.updateSubject(payload) : this.api.createSubject(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showSubjectModal.set(false);
        this.showSuccess(this.subjEditing ? 'Subject updated successfully.' : 'Subject enrolled successfully.');
        this.fetchSubjects();
        if (this.subjEditing && this.selectedSubject() && this.selectedSubject().subjectId === payload.subjectId) {
          this.selectedSubject.set({ ...this.selectedSubject(), ...payload });
        }
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || err?.error || 'Failed to save subject.'); }
    });
  }

  // ── visit create/edit ──
  toggleSampleType(t: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const arr: string[] = this.visitForm.sampleTypes || [];
    this.visitForm.sampleTypes = checked ? [...arr, t] : arr.filter(x => x !== t);
  }
  openCreateVisit(subjectId: number | null) {
    this.visitEditing = false;
    this.visitSubjectLocked = subjectId != null;
    this.visitForm = { visitId: this.nextId(this.allVisits(), 'visitId', 'VIS', 3), subjectId: subjectId, visitType: '', status: 'Scheduled', scheduledDate: this.today(), actualDate: '', observations: '', sampleCollected: false, sampleTypes: [] };
    this.clearMsg();
    this.showVisitModal.set(true);
  }
  openEditVisit(v: any) {
    this.openMenu.set(null);
    this.visitEditing = true;
    this.visitSubjectLocked = true;
    this.visitForm = { visitId: v.visitId, subjectId: v.subjectId, visitType: v.visitType || '', status: v.status || 'Scheduled', scheduledDate: v.scheduledDate || '', actualDate: v.actualDate || '', observations: v.observations || '', sampleCollected: !!v.sampleCollected, sampleTypes: v.sampleTypes || [] };
    this.clearMsg();
    this.showVisitModal.set(true);
  }
  saveVisit() {
    if (this.visitForm.subjectId == null) { this.showError('Subject is required.'); return; }
    if (this.visitForm.sampleCollected && (!this.visitForm.sampleTypes || this.visitForm.sampleTypes.length === 0)) { this.showError('Select at least one sample type when a sample was collected.'); return; }
    this.saving.set(true);
    const payload: any = {
      visitId: this.visitForm.visitId,
      subjectId: Number(this.visitForm.subjectId),
      visitType: this.visitForm.visitType || null,
      status: this.visitForm.status,
      scheduledDate: this.visitForm.scheduledDate || null,
      actualDate: this.visitForm.actualDate || null,
      observations: this.visitForm.observations || null,
      sampleCollected: !!this.visitForm.sampleCollected,
      sampleTypes: this.visitForm.sampleCollected ? this.visitForm.sampleTypes : null
    };
    const req = this.visitEditing ? this.api.updateVisit(payload) : this.api.createVisit(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showVisitModal.set(false);
        this.showSuccess(this.visitEditing ? 'Visit updated successfully.' : 'Visit logged successfully.');
        this.fetchVisits();
        if (this.selectedSubject()) this.loadDetail(this.selectedSubject().subjectId);
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || err?.error || 'Failed to save visit.'); }
    });
  }
  viewVisit(v: any) { this.openMenu.set(null); this.viewVisitData.set(v); }

  // ── event create/edit ──
  eventVisitOptions() {
    const sid = this.eventForm.subjectId;
    if (sid == null) return [];
    // prefer detail visits if the same subject; otherwise filter allVisits
    return this.allVisits().filter(v => v.subjectId === Number(sid));
  }
  onEventSubjectChange() { this.eventForm.visitId = ''; }
  openCreateEvent(subjectId: number | null) {
    this.eventEditing = false;
    this.eventSubjectLocked = subjectId != null;
    this.eventForm = { aeId: this.nextId(this.allEvents(), 'aeId', 'AE', 3), subjectId: subjectId, visitId: '', severity: '', relatedness: '', status: 'Open', onsetDate: this.today(), resolutionDate: '', description: '' };
    this.clearMsg();
    this.showEventModal.set(true);
  }
  openEditEvent(e: any) {
    this.openMenu.set(null);
    this.eventEditing = true;
    this.eventSubjectLocked = true;
    this.eventForm = { aeId: e.aeId, subjectId: e.subjectId, visitId: e.visitId || '', severity: e.severity || '', relatedness: e.relatedness || '', status: e.status || 'Open', onsetDate: e.onsetDate || '', resolutionDate: e.resolutionDate || '', description: e.description || '' };
    this.clearMsg();
    this.showEventModal.set(true);
  }
  saveEvent() {
    if (this.eventForm.subjectId == null || !this.eventForm.visitId || !this.eventForm.severity) { this.showError('Subject, Visit and Severity are required.'); return; }
    this.saving.set(true);
    const payload: any = {
      aeId: this.eventForm.aeId,
      subjectId: Number(this.eventForm.subjectId),
      visitId: this.eventForm.visitId,
      severity: this.eventForm.severity,
      relatedness: this.eventForm.relatedness || null,
      status: this.eventForm.status,
      onsetDate: this.eventForm.onsetDate || null,
      resolutionDate: this.eventForm.resolutionDate || null,
      description: this.eventForm.description || null
    };
    const req = this.eventEditing ? this.api.updateAdverseEvent(payload) : this.api.createAdverseEvent(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showEventModal.set(false);
        this.showSuccess(this.eventEditing ? 'Adverse event updated successfully.' : 'Adverse event reported successfully.');
        this.fetchEvents();
        if (this.selectedSubject()) this.loadDetail(this.selectedSubject().subjectId);
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || err?.error || 'Failed to save adverse event.'); }
    });
  }
  viewEvent(e: any) { this.openMenu.set(null); this.viewEventData.set(e); }

  // ── messages ──
  showSuccess(m: string) { this.successMsg.set(m); this.errorMsg.set(null); setTimeout(() => this.successMsg.set(null), 4000); }
  showError(m: string) { this.errorMsg.set(m); this.successMsg.set(null); setTimeout(() => this.errorMsg.set(null), 5000); }
  clearMsg() { this.errorMsg.set(null); this.successMsg.set(null); }
}
