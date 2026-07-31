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
    <div class="subjects-container">
      <!-- Master View: Subjects list -->
      <div class="master-panel" *ngIf="!selectedSubject()">
        <div class="panel-header">
          <div>
            <h2>Clinical Trial Subjects Registry</h2>
            <p>Enroll subjects and monitor patient visits and adverse events.</p>
          </div>
          <div>
            <button class="btn btn-primary" (click)="openEnrollModal()">+Enroll Subject</button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Trial Protocol</th>
                <th>Assigned Site</th>
                <th>Gender</th>
                <th>Enrollment Date</th>
                <th>Status</th>
                <th style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sub of paginatedSubjects()">
                <td style="font-weight: 700; color: #CE5200;">{{ sub.subjectCode }}</td>
                <td>{{ getTrialCode(sub.trialId) }}</td>
                <td>{{ getSiteName(sub.siteId) }}</td>
                <td>{{ sub.gender }}</td>
                <td>{{ sub.enrolmentDate }}</td>
                <td>
                  <span class="status-indicator" 
                    [class.status-enrolled]="sub.status === 'Enrolled'"
                    [class.status-reviewed]="sub.status === 'Reviewed'">
                    {{ sub.status }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="viewSubjectDetails(sub)">View</button>
                </td>
              </tr>
              <tr *ngIf="subjects().length === 0">
                <td colspan="7" class="empty-state">No subjects enrolled.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="subjects().length > 0">
          <button [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
          <span>Page {{ page() }} of {{ totalPages() }}</span>
          <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next</button>
        </div>
      </div>

      <!-- Detail View: Inline tabs for Subject Details, Visits, Adverse Events -->
      <div class="detail-panel" *ngIf="selectedSubject()">
        <div class="detail-header">
          <button class="btn btn-secondary" (click)="selectedSubject.set(null)">← Back to Subjects</button>
          
          <div class="header-title">
            <h3>Subject: {{ selectedSubject().subjectCode }}</h3>
            <span class="status-indicator" 
              [class.status-enrolled]="selectedSubject().status === 'Enrolled'"
              [class.status-reviewed]="selectedSubject().status === 'Reviewed'">
              {{ selectedSubject().status }}
            </span>
          </div>

          <!-- Workflow Controls -->
          <div class="workflow-controls" *ngIf="selectedSubject().status === 'Enrolled'">
            <button class="btn btn-primary" (click)="openSignatureModal('Reviewed')">
              Sign & Review Subject
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'details'" (click)="detailTab.set('details')">Subject Profile</button>
          <button [class.active]="detailTab() === 'visits'" (click)="detailTab.set('visits')">Visits Log</button>
          <button [class.active]="detailTab() === 'events'" (click)="detailTab.set('events')">Adverse Events (AE)</button>
          <button [class.active]="detailTab() === 'signatures'" (click)="detailTab.set('signatures')">Workflow Signatures</button>
        </div>

        <!-- Tab Cards -->
        <div class="tab-card">
          <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
          <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

          <!-- 1. DETAILS TAB -->
          <div *ngIf="detailTab() === 'details'" class="grid-details">
            <div class="detail-item"><span class="label">Subject Code:</span> {{ selectedSubject().subjectCode }}</div>
            <div class="detail-item"><span class="label">Date of Birth:</span> {{ selectedSubject().dateOfBirth }}</div>
            <div class="detail-item"><span class="label">Gender:</span> {{ selectedSubject().gender }}</div>
            <div class="detail-item"><span class="label">Consent Signed Date:</span> {{ selectedSubject().consentDate }}</div>
            <div class="detail-item"><span class="label">Enrollment Date:</span> {{ selectedSubject().enrolmentDate }}</div>
            <div class="detail-item"><span class="label">Trial Protocol:</span> {{ getTrialCode(selectedSubject().trialId) }}</div>
            <div class="detail-item"><span class="label">Investigation Site:</span> {{ getSiteName(selectedSubject().siteId) }}</div>
            <div class="detail-item"><span class="label">Verification Status:</span> {{ selectedSubject().status }}</div>
          </div>

          <!-- 2. VISITS TAB (Accessible only inside subject details) -->
          <div *ngIf="detailTab() === 'visits'">
            <div class="tab-action-bar">
              <h4>Recorded Visit Entries</h4>
              <button class="btn btn-secondary btn-sm" (click)="openAddVisitModal()">+Record Visit</button>
            </div>

            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Visit Code (ID)</th>
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
                    <td style="font-weight: 600;">{{ v.visitId }}</td>
                    <td>{{ v.visitType }}</td>
                    <td>{{ v.scheduledDate }}</td>
                    <td>{{ v.actualDate }}</td>
                    <td>{{ v.observations }}</td>
                    <td>
                      <span class="status-indicator" [class.status-active]="v.sampleCollected" [class.status-inactive]="!v.sampleCollected">
                        {{ v.sampleCollected ? 'Yes' : 'No' }}
                      </span>
                    </td>
                    <td><span class="role-pill">{{ v.status }}</span></td>
                  </tr>
                  <tr *ngIf="visits().length === 0">
                    <td colspan="7" class="empty-state">No visits recorded for this subject.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. ADVERSE EVENTS TAB (Accessible only inside subject details) -->
          <div *ngIf="detailTab() === 'events'">
            <div class="tab-action-bar">
              <h4>Adverse Events Manifest</h4>
              <button class="btn btn-secondary btn-sm" (click)="openAddEventModal()">+Record Event</button>
            </div>

            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>AE Code (ID)</th>
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
                    <td style="font-weight: 600; color: #b3261e;">{{ ae.aeId }}</td>
                    <td>{{ ae.visitId }}</td>
                    <td>{{ ae.description }}</td>
                    <td>
                      <span class="severity-pill" [class.sev-minor]="ae.severity === 'Minor'" [class.sev-major]="ae.severity === 'Major'" [class.sev-critical]="ae.severity === 'Critical'">
                        {{ ae.severity }}
                      </span>
                    </td>
                    <td>{{ ae.relatedness }}</td>
                    <td>{{ ae.onsetDate }}</td>
                    <td><span class="status-indicator status-active">{{ ae.status }}</span></td>
                  </tr>
                  <tr *ngIf="adverseEvents().length === 0">
                    <td colspan="7" class="empty-state">No adverse events recorded for this subject.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 4. SIGNATURES HISTORY TAB -->
          <div *ngIf="detailTab() === 'signatures'">
            <h4>Electronic Signatures Applied</h4>
            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
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
                    <td>{{ s.signerName }}</td>
                    <td><span class="role-pill">{{ s.meaning }}</span></td>
                    <td>v{{ s.entityVersion }}</td>
                    <td>{{ s.signedAt | date:'medium' }}</td>
                    <td style="font-family: monospace; font-size: 11px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="s.signatureHash">
                      {{ s.signatureHash }}
                    </td>
                  </tr>
                  <tr *ngIf="signatureHistory().length === 0">
                    <td colspan="5" class="empty-state">No electronic signatures applied to this subject.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODALS ── -->

      <!-- 1. ENROLL SUBJECT MODAL -->
      <div class="modal-overlay" *ngIf="showEnrollModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Enroll New Clinical Subject</h3>
            <button class="close-modal" (click)="showEnrollModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleEnrollSubject()">
            <div class="field">
              <label>Subject Code (Auto-Generated)</label>
              <input type="text" name="subjectCode" [value]="enrollForm.subjectCode" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Trial Protocol</label>
                <select name="trialId" [(ngModel)]="enrollForm.trialId" required>
                  <option *ngFor="let t of trials()" [value]="t.trialId">{{ t.trialCode }} (Phase: {{ t.phase }})</option>
                </select>
              </div>
              <div class="field">
                <label>Assigned Investigation Site</label>
                <select name="siteId" [(ngModel)]="enrollForm.siteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Date of Birth</label>
                <input type="date" name="dob" [(ngModel)]="enrollForm.dateOfBirth" required>
              </div>
              <div class="field">
                <label>Gender</label>
                <select name="gender" [(ngModel)]="enrollForm.gender" required>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Consent Date</label>
                <input type="date" name="consentDate" [(ngModel)]="enrollForm.consentDate" required>
              </div>
              <div class="field">
                <label>Enrollment Date</label>
                <input type="date" name="enrolmentDate" [(ngModel)]="enrollForm.enrolmentDate" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showEnrollModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Enroll Subject</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. ADD VISIT MODAL -->
      <div class="modal-overlay" *ngIf="showAddVisitModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Record Subject Visit</h3>
            <button class="close-modal" (click)="showAddVisitModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleRecordVisit()">
            <div class="field">
              <label>Visit Code (Auto-Generated ID)</label>
              <input type="text" name="visitId" [value]="addVisitForm.visitId" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Visit Type / Name</label>
                <input type="text" name="visitType" [(ngModel)]="addVisitForm.visitType" placeholder="e.g. Week 2 Follow-Up" required>
              </div>
              <div class="field">
                <label>Status</label>
                <select name="vStatus" [(ngModel)]="addVisitForm.status" required>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Completed">Completed</option>
                  <option value="Missed">Missed</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Scheduled Date</label>
                <input type="date" name="schedD" [(ngModel)]="addVisitForm.scheduledDate" required>
              </div>
              <div class="field">
                <label>Actual Visit Date</label>
                <input type="date" name="actD" [(ngModel)]="addVisitForm.actualDate" required>
              </div>
            </div>
            <div class="field">
              <label>Observations / Clinical Findings</label>
              <input type="text" name="obs" [(ngModel)]="addVisitForm.observations" placeholder="Vitals normal, no complaints" required>
            </div>
            <div class="field">
              <label class="remember">
                <input type="checkbox" name="sample" [(ngModel)]="addVisitForm.sampleCollected"> Biological Sample Collected
              </label>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showAddVisitModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Record Visit</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 3. ADD ADVERSE EVENT MODAL -->
      <div class="modal-overlay" *ngIf="showAddEventModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Record Adverse Event (AE)</h3>
            <button class="close-modal" (click)="showAddEventModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleRecordEvent()">
            <div class="field">
              <label>Event Code (Auto-Generated ID)</label>
              <input type="text" name="aeId" [value]="addEventForm.aeId" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Select Associated Visit</label>
                <select name="visitId" [(ngModel)]="addEventForm.visitId" required>
                  <option *ngFor="let v of visits()" [value]="v.visitId">{{ v.visitType }} ({{ v.actualDate }})</option>
                </select>
              </div>
              <div class="field">
                <label>Severity Level</label>
                <select name="severity" [(ngModel)]="addEventForm.severity" required>
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Event Description</label>
              <input type="text" name="desc" [(ngModel)]="addEventForm.description" placeholder="e.g. Mild headache, hives on left arm" required>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Relatedness to Investigational Product</label>
                <select name="rel" [(ngModel)]="addEventForm.relatedness" required>
                  <option value="Unrelated">Unrelated</option>
                  <option value="Possible">Possible</option>
                  <option value="Probable">Probable</option>
                </select>
              </div>
              <div class="field">
                <label>Outcome Status</label>
                <input type="text" name="aeStatus" [(ngModel)]="addEventForm.status" placeholder="e.g. Resolved" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Onset Date</label>
                <input type="date" name="onDate" [(ngModel)]="addEventForm.onsetDate" required>
              </div>
              <div class="field">
                <label>Resolution Date</label>
                <input type="date" name="resDate" [(ngModel)]="addEventForm.resolutionDate">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showAddEventModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Log Event</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 4. ELECTRONIC SIGNATURE DIALOG -->
      <div class="modal-overlay" *ngIf="showSignatureModal()">
        <div class="modal-card" style="max-width: 420px;">
          <div class="modal-header">
            <h3>Electronic Signature Verification</h3>
            <button class="close-modal" (click)="showSignatureModal.set(false)">×</button>
          </div>
          <div class="details-pane" style="font-size: 13.5px; margin-bottom: 8px;">
            <p>You are applying a legally binding electronic signature to transition this subject's verification state.</p>
            <div class="detail-item"><span class="label">Action:</span> Transition to <strong>{{ targetStatus() }}</strong></div>
            <div class="detail-item"><span class="label">Meaning:</span> REVIEWED</div>
          </div>
          <form (ngSubmit)="executeSignatureTransition()">
            <div class="field">
              <label>Verify Identity Password</label>
              <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showSignatureModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="signing()">
                {{ signing() ? 'Signing...' : 'Verify & Commit' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .subjects-container {
      background: #ffffff;
      border: 1px solid #ece4dc;
      border-radius: 14px;
      padding: 32px;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .panel-header h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #211611;
      margin: 0 0 6px;
    }
    .panel-header p {
      color: #7a6a5e;
      font-size: 14px;
      margin: 0;
    }
    .table-container {
      overflow-x: auto;
      margin-bottom: 20px;
      border: 1px solid #ece4dc;
      border-radius: 10px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }
    .data-table th {
      background: #f7f5f2;
      color: #211611;
      font-weight: 700;
      padding: 14px 16px;
      border-bottom: 1px solid #ece4dc;
    }
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #ece4dc;
      color: #211611;
      vertical-align: middle;
    }
    .status-indicator {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      border: 1px solid transparent;
    }
    .status-enrolled {
      background: #fff8e1;
      color: #f57f17;
      border-color: #ffe082;
    }
    .status-reviewed {
      background: #e8f5e9;
      color: #2e7d32;
      border-color: #c8e6c9;
    }
    .severity-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12.5px;
      font-weight: 600;
    }
    .sev-minor { background: #e8f1fa; color: #1d5f9e; }
    .sev-major { background: #fff8e1; color: #f57f17; }
    .sev-critical { background: #fbeceb; color: #b3261e; }
    .pagination {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      font-size: 13.5px;
      color: #7a6a5e;
    }
    .pagination button {
      background: #ffffff;
      border: 1px solid #ece4dc;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      color: #211611;
    }
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .detail-panel {
      text-align: left;
    }
    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 24px;
      border-bottom: 1px solid #ece4dc;
      padding-bottom: 16px;
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-title h3 {
      font-family: 'Manrope', sans-serif;
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #211611;
    }
    .workflow-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .detail-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }
    .detail-tabs button {
      background: none;
      border: none;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      color: #7a6a5e;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .detail-tabs button:hover {
      background: #fbe9de;
      color: #CE5200;
    }
    .detail-tabs button.active {
      background: #fbe9de;
      color: #CE5200;
      border: 1px solid #ece4dc;
    }
    .tab-card {
      border: 1px solid #ece4dc;
      border-radius: 12px;
      padding: 24px;
    }
    .grid-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .detail-item {
      font-size: 14px;
      color: #211611;
    }
    .detail-item .label {
      font-weight: 700;
      color: #7a6a5e;
      display: inline-block;
      width: 180px;
    }
    .tab-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tab-action-bar h4 {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: 16px;
      font-weight: 800;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      font-family: inherit;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 12.5px;
    }
    .btn-primary {
      background: #CE5200;
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #562200;
    }
    .btn-secondary {
      background: #ffffff;
      border: 1px solid #ece4dc;
      color: #211611;
    }
    .btn-secondary:hover {
      background: #fbe9de;
      color: #CE5200;
    }
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(42, 20, 8, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 500px;
      padding: 32px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ece4dc;
      padding-bottom: 12px;
    }
    .modal-header h3 {
      font-family: 'Manrope', sans-serif;
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #211611;
    }
    .close-modal {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #7a6a5e;
    }
    .field {
      text-align: left;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      font-size: 13px;
      font-weight: 700;
      color: #211611;
    }
    .field input, .field select {
      padding: 10px 12px;
      border: 1px solid #ece4dc;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      background: #ffffff;
    }
    .field input:focus, .field select:focus {
      border-color: #CE5200;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #ece4dc;
      padding-top: 16px;
    }
    .alert {
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13.5px;
    }
    .alert-error {
      background: #fbeceb;
      color: #b3261e;
      border: 1px solid #f5c2c0;
    }
    .alert-success {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }
    .empty-state {
      text-align: center;
      color: #7a6a5e;
      font-style: italic;
      padding: 24px !important;
    }
    .details-pane {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
    }
    .detail-item .label {
      font-weight: 700;
      color: #7a6a5e;
      width: 140px;
      display: inline-block;
    }
    .remember {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #211611;
      font-weight: 600;
      cursor: pointer;
    }
    .remember input {
      width: 16px;
      height: 16px;
      accent-color: #CE5200;
    }
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
}
