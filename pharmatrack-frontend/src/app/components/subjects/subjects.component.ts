import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-trial-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ============ LIST VIEW ============ -->
    <div class="subjects-container" *ngIf="!selectedSubject()">
      <div class="page-head">
        <div>
          <h1 class="page-title">Subject Enrolment</h1>
          <div class="page-sub">Enroll subjects and monitor patient visits and adverse events.</div>
        </div>
        <button class="btn btn-primary btn-create" (click)="openEnrollModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          <span>Enroll Subject</span>
        </button>
      </div>

      <div class="filter-row">
        <div class="input-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Search subject code">
        </div>
        <div class="filter-select">
          <svg class="funnel-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select aria-label="Filter by Status">
            <option value="">All</option>
            <option value="Enrolled">Enrolled</option>
            <option value="Reviewed">Reviewed</option>
          </select>
          <svg class="caret-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <div class="table-card">
        <div class="table-card-head">
          <h3>Subjects <span class="count">· {{ subjects().length }} total</span></h3>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Trial Protocol</th>
                <th>Assigned Site</th>
                <th>Gender</th>
                <th>Enrollment Date</th>
                <th>Status</th>
                <th style="text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sub of paginatedSubjects()">
                <td class="name-cell">{{ sub.subjectCode }}</td>
                <td>{{ getTrialCode(sub.trialId) }}</td>
                <td>{{ getSiteName(sub.siteId) }}</td>
                <td>{{ sub.gender }}</td>
                <td>{{ sub.enrolmentDate }}</td>
                <td>
                  <span class="badge-status"
                    [class.badge-progress]="sub.status === 'Enrolled'"
                    [class.badge-approved]="sub.status === 'Reviewed'">
                    {{ sub.status }}
                  </span>
                </td>
                <td class="actions-cell" style="text-align:center;">
                  <div class="dropdown row-actions">
                    <button type="button" class="icon-menu-btn" aria-label="Row actions">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right">
                      <button type="button" class="dropdown-item" (click)="viewSubjectDetails(sub)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="subjects().length === 0">
                <td colspan="7" class="empty-state">No subjects enrolled.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer" *ngIf="subjects().length > 0">
          <div>Page {{ page() }} of {{ totalPages() }}</div>
          <div class="pager">
            <button [disabled]="page() === 1" (click)="page.set(page() - 1)" aria-label="Previous page">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" aria-label="Next page">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ============ DETAIL VIEW (tabbed) ============ -->
    <div class="subjects-container" *ngIf="selectedSubject()">
      <div class="breadcrumb">
        <a href="javascript:void(0)" (click)="selectedSubject.set(null)">Subjects</a> / <b>{{ selectedSubject().subjectCode }}</b>
      </div>

      <div class="page-head">
        <div>
          <h1 class="page-title">{{ selectedSubject().subjectCode }}</h1>
          <div class="page-sub">
            <span class="badge-status"
              [class.badge-progress]="selectedSubject().status === 'Enrolled'"
              [class.badge-approved]="selectedSubject().status === 'Reviewed'">
              {{ selectedSubject().status }}
            </span>
          </div>
        </div>
        <div class="head-actions">
          <button class="btn btn-secondary" (click)="selectedSubject.set(null)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Subjects
          </button>
          <button class="btn btn-primary" *ngIf="selectedSubject().status === 'Enrolled'" (click)="openSignatureModal('Reviewed')">
            Sign &amp; Review Subject
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" [class.active]="detailTab() === 'details'" (click)="detailTab.set('details')">Subject Details</button>
        <button class="tab" [class.active]="detailTab() === 'visits'" (click)="detailTab.set('visits')">Visits</button>
        <button class="tab" [class.active]="detailTab() === 'events'" (click)="detailTab.set('events')">Adverse Events</button>
        <button class="tab" [class.active]="detailTab() === 'signatures'" (click)="detailTab.set('signatures')">Workflow Signatures</button>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- 1. SUBJECT DETAILS TAB -->
      <div *ngIf="detailTab() === 'details'" class="detail-card">
        <div class="detail-grid">
          <div class="detail-field"><label>Subject Code</label><div class="value">{{ selectedSubject().subjectCode }}</div></div>
          <div class="detail-field"><label>Date of Birth</label><div class="value">{{ selectedSubject().dateOfBirth }}</div></div>
          <div class="detail-field"><label>Gender</label><div class="value">{{ selectedSubject().gender }}</div></div>
          <div class="detail-field"><label>Consent Signed Date</label><div class="value">{{ selectedSubject().consentDate }}</div></div>
          <div class="detail-field"><label>Enrollment Date</label><div class="value">{{ selectedSubject().enrolmentDate }}</div></div>
          <div class="detail-field"><label>Trial Protocol</label><div class="value">{{ getTrialCode(selectedSubject().trialId) }}</div></div>
          <div class="detail-field"><label>Investigation Site</label><div class="value">{{ getSiteName(selectedSubject().siteId) }}</div></div>
          <div class="detail-field"><label>Verification Status</label><div class="value">{{ selectedSubject().status }}</div></div>
        </div>
      </div>

      <!-- 2. VISITS TAB -->
      <div *ngIf="detailTab() === 'visits'" class="table-card">
        <div class="table-card-head">
          <h3>Recorded Visit Entries <span class="count">· {{ visits().length }} total</span></h3>
          <button class="btn btn-primary btn-sm btn-create" (click)="openAddVisitModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Record Visit</span>
          </button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Visit Code</th>
                <th>Visit Type</th>
                <th>Scheduled Date</th>
                <th>Actual Date</th>
                <th>Observations / Notes</th>
                <th>Sample Collected</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of visits()">
                <td class="name-cell">{{ v.visitId }}</td>
                <td>{{ v.visitType }}</td>
                <td>{{ v.scheduledDate }}</td>
                <td>{{ v.actualDate }}</td>
                <td>{{ v.observations }}</td>
                <td>
                  <span class="badge-status" [class.badge-approved]="v.sampleCollected" [class.badge-draft]="!v.sampleCollected">
                    {{ v.sampleCollected ? 'Yes' : 'No' }}
                  </span>
                </td>
                <td>
                  <span class="badge-status"
                    [class.badge-draft]="v.status === 'Scheduled'"
                    [class.badge-approved]="v.status === 'Completed'"
                    [class.badge-rejected]="v.status === 'Missed'">
                    {{ v.status }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="visits().length === 0">
                <td colspan="7" class="empty-state">No visits recorded for this subject.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3. ADVERSE EVENTS TAB -->
      <div *ngIf="detailTab() === 'events'" class="table-card">
        <div class="table-card-head">
          <h3>Adverse Events Manifest <span class="count">· {{ adverseEvents().length }} total</span></h3>
          <button class="btn btn-primary btn-sm btn-create" (click)="openAddEventModal()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Record Event</span>
          </button>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>AE Code</th>
                <th>Visit ID</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Relatedness</th>
                <th>Onset Date</th>
                <th>Outcome Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ae of adverseEvents()">
                <td class="name-cell">{{ ae.aeId }}</td>
                <td>{{ ae.visitId }}</td>
                <td>{{ ae.description }}</td>
                <td>
                  <span class="badge-status"
                    [class.badge-submitted]="ae.severity === 'Minor'"
                    [class.badge-progress]="ae.severity === 'Major'"
                    [class.badge-rejected]="ae.severity === 'Critical'">
                    {{ ae.severity }}
                  </span>
                </td>
                <td>{{ ae.relatedness }}</td>
                <td>{{ ae.onsetDate }}</td>
                <td><span class="badge-status badge-active">{{ ae.status }}</span></td>
              </tr>
              <tr *ngIf="adverseEvents().length === 0">
                <td colspan="7" class="empty-state">No adverse events recorded for this subject.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. WORKFLOW SIGNATURES TAB -->
      <div *ngIf="detailTab() === 'signatures'" class="table-card">
        <div class="table-card-head">
          <h3>Electronic Signatures Applied <span class="count">· {{ signatureHistory().length }} total</span></h3>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Signer</th>
                <th>Meaning</th>
                <th>Ver.</th>
                <th>Signed At</th>
                <th>SHA-256 Checksum Hash</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of signatureHistory()">
                <td class="name-cell">{{ s.signerName }}</td>
                <td><span class="badge-status badge-submitted">{{ s.meaning }}</span></td>
                <td>v{{ s.entityVersion }}</td>
                <td>{{ s.signedAt | date:'medium' }}</td>
                <td class="hash-cell" [title]="s.signatureHash">{{ s.signatureHash }}</td>
              </tr>
              <tr *ngIf="signatureHistory().length === 0">
                <td colspan="5" class="empty-state">No electronic signatures applied to this subject.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ============ MODALS ============ -->

    <!-- 1. ENROLL SUBJECT MODAL -->
    <div class="modal-overlay" *ngIf="showEnrollModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showEnrollModal)" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2>Enroll New Clinical Subject</h2>
        <form (ngSubmit)="handleEnrollSubject()">
          <div class="form-grid">
            <div class="field full">
              <label>Subject Code<span class="req">*</span></label>
              <input type="text" name="subjectCode" [value]="enrollForm.subjectCode" disabled>
              <div class="field-hint">Auto-generated</div>
            </div>
            <div class="field">
              <label>Trial Protocol<span class="req">*</span></label>
              <select name="trialId" [(ngModel)]="enrollForm.trialId" required>
                <option *ngFor="let t of trials()" [value]="t.trialId">{{ t.trialCode }} (Phase: {{ t.phase }})</option>
              </select>
            </div>
            <div class="field">
              <label>Assigned Investigation Site<span class="req">*</span></label>
              <select name="siteId" [(ngModel)]="enrollForm.siteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Date of Birth<span class="req">*</span></label>
              <input type="date" name="dob" [(ngModel)]="enrollForm.dateOfBirth" required>
            </div>
            <div class="field">
              <label>Gender<span class="req">*</span></label>
              <select name="gender" [(ngModel)]="enrollForm.gender" required>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="field">
              <label>Consent Date<span class="req">*</span></label>
              <input type="date" name="consentDate" [(ngModel)]="enrollForm.consentDate" required>
            </div>
            <div class="field">
              <label>Enrollment Date<span class="req">*</span></label>
              <input type="date" name="enrolmentDate" [(ngModel)]="enrollForm.enrolmentDate" required>
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary">Enroll Subject</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. ADD VISIT MODAL -->
    <div class="modal-overlay" *ngIf="showAddVisitModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showAddVisitModal)" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2>Record Subject Visit</h2>
        <form (ngSubmit)="handleRecordVisit()">
          <div class="form-grid">
            <div class="field full">
              <label>Visit Code<span class="req">*</span></label>
              <input type="text" name="visitId" [value]="addVisitForm.visitId" disabled>
              <div class="field-hint">Auto-generated</div>
            </div>
            <div class="field">
              <label>Visit Type / Name<span class="req">*</span></label>
              <input type="text" name="visitType" [(ngModel)]="addVisitForm.visitType" placeholder="e.g. Week 2 Follow-Up" required>
            </div>
            <div class="field">
              <label>Status<span class="req">*</span></label>
              <select name="vStatus" [(ngModel)]="addVisitForm.status" required>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Missed">Missed</option>
              </select>
            </div>
            <div class="field">
              <label>Scheduled Date<span class="req">*</span></label>
              <input type="date" name="schedD" [(ngModel)]="addVisitForm.scheduledDate" required>
            </div>
            <div class="field">
              <label>Actual Visit Date<span class="req">*</span></label>
              <input type="date" name="actD" [(ngModel)]="addVisitForm.actualDate" required>
            </div>
            <div class="field full">
              <label>Observations / Clinical Findings<span class="req">*</span></label>
              <input type="text" name="obs" [(ngModel)]="addVisitForm.observations" placeholder="Vitals normal, no complaints" required>
            </div>
            <div class="field full">
              <label class="check-field">
                <input type="checkbox" name="sample" [(ngModel)]="addVisitForm.sampleCollected"> Biological Sample Collected
              </label>
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary">Record Visit</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. ADD ADVERSE EVENT MODAL -->
    <div class="modal-overlay" *ngIf="showAddEventModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showAddEventModal)" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2>Record Adverse Event (AE)</h2>
        <form (ngSubmit)="handleRecordEvent()">
          <div class="form-grid">
            <div class="field full">
              <label>Event Code<span class="req">*</span></label>
              <input type="text" name="aeId" [value]="addEventForm.aeId" disabled>
              <div class="field-hint">Auto-generated</div>
            </div>
            <div class="field">
              <label>Select Associated Visit<span class="req">*</span></label>
              <select name="visitId" [(ngModel)]="addEventForm.visitId" required>
                <option *ngFor="let v of visits()" [value]="v.visitId">{{ v.visitType }} ({{ v.actualDate }})</option>
              </select>
            </div>
            <div class="field">
              <label>Severity Level<span class="req">*</span></label>
              <select name="severity" [(ngModel)]="addEventForm.severity" required>
                <option value="Minor">Minor</option>
                <option value="Major">Major</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div class="field full">
              <label>Event Description<span class="req">*</span></label>
              <input type="text" name="desc" [(ngModel)]="addEventForm.description" placeholder="e.g. Mild headache, hives on left arm" required>
            </div>
            <div class="field">
              <label>Relatedness to Investigational Product<span class="req">*</span></label>
              <select name="rel" [(ngModel)]="addEventForm.relatedness" required>
                <option value="Unrelated">Unrelated</option>
                <option value="Possible">Possible</option>
                <option value="Probable">Probable</option>
              </select>
            </div>
            <div class="field">
              <label>Outcome Status<span class="req">*</span></label>
              <input type="text" name="aeStatus" [(ngModel)]="addEventForm.status" placeholder="e.g. Resolved" required>
            </div>
            <div class="field">
              <label>Onset Date<span class="req">*</span></label>
              <input type="date" name="onDate" [(ngModel)]="addEventForm.onsetDate" required>
            </div>
            <div class="field">
              <label>Resolution Date</label>
              <input type="date" name="resDate" [(ngModel)]="addEventForm.resolutionDate">
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary">Log Event</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 4. ELECTRONIC SIGNATURE DIALOG -->
    <div class="modal-overlay" *ngIf="showSignatureModal()">
      <div class="modal modal-sm">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showSignatureModal)" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2>Electronic Signature Verification</h2>
        <div class="info-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <div>
            You are applying a legally binding electronic signature to transition this subject's verification state.
            <div style="margin-top:8px;">Action: Transition to <strong>{{ targetStatus() }}</strong> &nbsp;·&nbsp; Meaning: <strong>REVIEWED</strong></div>
          </div>
        </div>
        <form (ngSubmit)="executeSignatureTransition()">
          <div class="field">
            <label>Verify Identity Password<span class="req">*</span></label>
            <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary" [disabled]="signing()">
              {{ signing() ? 'Signing...' : 'Verify & Commit' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;}

    /* Tabs (subject detail) */
    .tabs{display:flex;gap:30px;margin-bottom:24px;border-bottom:1px solid var(--border);}
    .tab{appearance:none;border:none;background:none;font-family:inherit;font-size:14.5px;font-weight:600;color:var(--text-dim);padding:10px 2px;cursor:pointer;position:relative;top:1px;border-bottom:2px solid transparent;}
    .tab:hover{color:var(--text);}
    .tab.active{color:var(--text);border-bottom:2px solid var(--text);}

    /* Page-head action cluster */
    .head-actions{display:flex;align-items:center;gap:12px;flex-shrink:0;}

    /* Row action dropdown reveal without extra state */
    .row-actions .dropdown-menu{display:none;}
    .row-actions:hover .dropdown-menu,
    .row-actions:focus-within .dropdown-menu{display:block;}

    /* Detail card */
    .detail-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:30px 34px;}

    /* Table-card action button spacing */
    .table-card-head .btn{margin:-2px 0;}

    /* Neutral badge (not defined globally) */
    .badge-draft{background:#eef0ef;color:#3c463f;}

    /* Signature hash cell */
    .hash-cell{font-family:'SFMono-Regular',Consolas,monospace;font-size:11.5px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-dim);}

    /* Modal sizing helpers */
    .modal{max-height:88vh;overflow-y:auto;}
    .modal-sm{max-width:440px;}

    /* Checkbox field */
    .check-field{display:flex;align-items:center;gap:10px;font-size:14px;font-weight:600;color:var(--text);cursor:pointer;}
    .check-field input{width:16px;height:16px;accent-color:var(--accent);}

    /* Alerts */
    .alert{padding:11px 16px;border-radius:var(--radius-sm);margin-bottom:20px;font-size:13.5px;}
    .alert-error{background:var(--danger-light);color:var(--danger);border:1px solid #f5c2c0;}
    .alert-success{background:#e6f4ec;color:#2f7d4f;border:1px solid #c8e6c9;}

    /* Empty state */
    .empty-state{text-align:center;color:var(--text-dim);font-style:italic;padding:40px 20px;}

    /* Funnel status filter dropdown */
    .filter-select{position:relative;display:inline-flex;align-items:center;min-width:200px;}
    .filter-select .funnel-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select .caret-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 36px 11px 38px;font-size:14px;background:transparent;color:var(--text);font-family:inherit;cursor:pointer;}
    .filter-select select:focus{outline:none;border-color:var(--accent);}
  `]
})
export class SubjectsComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  subjects = signal<any[]>([]);
  trials = signal<any[]>([]);
  sites = signal<any[]>([]);

  // Selection
  selectedSubject = signal<any | null>(null);
  detailTab = signal<'details' | 'visits' | 'events' | 'signatures'>('details');

  // Sub-logs accessible only inside subject details
  visits = signal<any[]>([]);
  adverseEvents = signal<any[]>([]);
  signatureHistory = signal<any[]>([]);

  // Pagination states
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  // Modals Visibility
  showEnrollModal = signal<boolean>(false);
  showAddVisitModal = signal<boolean>(false);
  showAddEventModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // Form Models
  enrollForm = {
    subjectCode: '',
    trialId: null as any,
    siteId: null as any,
    dateOfBirth: '',
    gender: 'Male',
    consentDate: '',
    enrolmentDate: '',
    status: 'Enrolled'
  };

  addVisitForm = {
    visitId: '',
    visitType: '',
    scheduledDate: '',
    actualDate: '',
    observations: '',
    sampleCollected: false,
    status: 'Scheduled'
  };

  addEventForm = {
    aeId: '',
    visitId: '',
    description: '',
    severity: 'Minor',
    relatedness: 'Unrelated',
    onsetDate: '',
    resolutionDate: '',
    status: 'Active'
  };

  // Electronic Signature
  signaturePassword = '';
  targetStatus = signal<string>('');
  signing = signal<boolean>(false);

  ngOnInit() {
    this.fetchTrials();
    this.fetchSites();
    this.fetchSubjects();
  }

  fetchSubjects() {
    this.apiService.getSubjects().subscribe({
      next: (data) => {
        this.subjects.set(data || []);
        this.totalPages.set(Math.ceil(data.length / this.pageSize) || 1);
      },
      error: (err) => this.showError(err.error?.message || 'Error loading enrolled subjects registry.')
    });
  }

  fetchTrials() {
    this.apiService.getAllTrials().subscribe({
      next: (data) => this.trials.set(data || [])
    });
  }

  fetchSites() {
    this.apiService.getSites().subscribe({
      next: (res) => {
        if (res.success) {
          this.sites.set(res.data || []);
        }
      }
    });
  }

  paginatedSubjects() {
    const start = (this.page() - 1) * this.pageSize;
    return this.subjects().slice(start, start + this.pageSize);
  }

  getTrialCode(trialId: number): string {
    const t = this.trials().find(item => item.trialId === trialId);
    return t ? t.trialCode : `Trial ID: ${trialId}`;
  }

  getSiteName(siteId: number): string {
    const s = this.sites().find(item => item.siteId === siteId);
    return s ? s.siteName : `Site ID: ${siteId}`;
  }

  viewSubjectDetails(sub: any) {
    this.selectedSubject.set(sub);
    this.detailTab.set('details');
    this.clearMessages();
    this.fetchVisits(sub.subjectId);
    this.fetchAdverseEvents(sub.subjectId);
    this.fetchSignatureHistory(sub.subjectCode);
  }

  fetchVisits(subjectId: number) {
    this.apiService.getVisitsBySubjectId(subjectId).subscribe({
      next: (data) => this.visits.set(data || []),
      error: () => this.visits.set([])
    });
  }

  fetchAdverseEvents(subjectId: number) {
    this.apiService.getAdverseEventsBySubjectId(subjectId).subscribe({
      next: (data) => this.adverseEvents.set(data || []),
      error: () => this.adverseEvents.set([])
    });
  }

  fetchSignatureHistory(subjectCode: string) {
    this.apiService.getSignatures('TrialSubject', subjectCode).subscribe({
      next: (res) => {
        if (res.success) {
          this.signatureHistory.set(res.data || []);
        }
      },
      error: () => this.signatureHistory.set([])
    });
  }

  openEnrollModal() {
    const rand = Math.floor(100 + Math.random() * 900);
    this.enrollForm = {
      subjectCode: `SUB-${rand}`,
      trialId: this.trials()[0]?.trialId || null,
      siteId: this.sites()[0]?.siteId || null,
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      consentDate: new Date().toISOString().substring(0, 10),
      enrolmentDate: new Date().toISOString().substring(0, 10),
      status: 'Enrolled'
    };
    this.showEnrollModal.set(true);
    this.clearMessages();
  }

  handleEnrollSubject() {
    // Generate some subjectId integer for backend database mapping if needed
    const payload = {
      ...this.enrollForm,
      trialId: parseInt(this.enrollForm.trialId, 10),
      siteId: parseInt(this.enrollForm.siteId, 10)
    };

    this.apiService.createSubject(payload).subscribe({
      next: () => {
        this.showSuccess('Subject successfully enrolled in clinical study cohort.');
        this.showEnrollModal.set(false);
        this.fetchSubjects();
      },
      error: (err) => this.showError(err.error?.message || 'Enrollment transaction failed.')
    });
  }

  openAddVisitModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.addVisitForm = {
      visitId: `VIS-${rand}`,
      visitType: 'Screening Visit',
      scheduledDate: new Date().toISOString().substring(0, 10),
      actualDate: new Date().toISOString().substring(0, 10),
      observations: 'Vital signs checked. Blood sample collected.',
      sampleCollected: true,
      status: 'Completed'
    };
    this.showAddVisitModal.set(true);
    this.clearMessages();
  }

  handleRecordVisit() {
    const payload = {
      ...this.addVisitForm,
      subjectId: this.selectedSubject().subjectId
    };

    this.apiService.createVisit(payload).subscribe({
      next: () => {
        this.showSuccess('Patient study visit recorded successfully.');
        this.showAddVisitModal.set(false);
        this.fetchVisits(payload.subjectId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to record visit.')
    });
  }

  openAddEventModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.addEventForm = {
      aeId: `AE-${rand}`,
      visitId: this.visits()[0]?.visitId || '',
      description: 'Patient reported mild headache and nausea.',
      severity: 'Minor',
      relatedness: 'Possible',
      onsetDate: new Date().toISOString().substring(0, 10),
      resolutionDate: '',
      status: 'Active'
    };
    this.showAddEventModal.set(true);
    this.clearMessages();
  }

  handleRecordEvent() {
    const payload = {
      ...this.addEventForm,
      subjectId: this.selectedSubject().subjectId,
      resolutionDate: this.addEventForm.resolutionDate || null
    };

    this.apiService.createAdverseEvent(payload).subscribe({
      next: () => {
        this.showSuccess('Adverse event logged and flagged successfully.');
        this.showAddEventModal.set(false);
        this.fetchAdverseEvents(payload.subjectId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to log adverse event.')
    });
  }

  openSignatureModal(target: string) {
    this.targetStatus.set(target);
    this.signaturePassword = '';
    this.showSignatureModal.set(true);
    this.clearMessages();
  }

  executeSignatureTransition() {
    this.signing.set(true);
    this.clearMessages();

    // Sign the record:
    // POST /pharmaTrack/identityAccess/signatures
    const signaturePayload = {
      entityType: 'TrialSubject',
      entityId: this.selectedSubject().subjectCode,
      entityVersion: '1',
      meaning: 'REVIEWED'
    };

    this.apiService.signEntity(signaturePayload).subscribe({
      next: (res) => {
        if (res.success) {
          // Transition the workflow:
          // POST /pharmaTrack/subjectEnrolment/workflow/transition
          const transitionPayload = {
            entityType: 'TrialSubject',
            entityId: this.selectedSubject().subjectCode,
            targetStatus: this.targetStatus(),
            reason: `Subject review complete with Electronic Signature ID ${res.data?.signatureId}`
          };

          this.apiService.transitionWorkflow('subjectEnrolment', transitionPayload).subscribe({
            next: () => {
              this.signing.set(false);
              this.showSignatureModal.set(false);
              this.showSuccess('Subject verified and transitioned to Reviewed state.');

              // Reload details
              const updatedSub = { ...this.selectedSubject(), status: this.targetStatus() };
              this.selectedSubject.set(updatedSub);
              this.fetchSubjects();
              this.fetchSignatureHistory(updatedSub.subjectCode);
            },
            error: (err) => {
              this.signing.set(false);
              this.showError(`Signature applied, but state transition failed: ${err.error?.message || err.message}`);
            }
          });
        } else {
          this.signing.set(false);
          this.showError(`Electronic Signature Rejected: ${res.message}`);
        }
      },
      error: (err) => {
        this.signing.set(false);
        this.showError(`Identity verification failed. Signature rejected.`);
      }
    });
  }

  showSuccess(msg: string) {
    this.successMsg.set(msg);
    this.errorMsg.set(null);
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  showError(msg: string) {
    this.errorMsg.set(msg);
    this.successMsg.set(null);
    setTimeout(() => this.errorMsg.set(null), 4000);
  }

  clearMessages() {
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }

  // Close an input modal only after confirming discard of unsaved changes
  closeWithConfirm(modalSignal: { set: (v: boolean) => void }) {
    if (window.confirm('Discard unsaved changes?')) {
      modalSignal.set(false);
    }
  }
}
