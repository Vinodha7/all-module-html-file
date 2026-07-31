import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-clinical-trials',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <!-- ================= MASTER VIEW: TRIALS LIST ================= -->
      <div *ngIf="!selectedTrial()">
        <div class="page-head">
          <div>
            <h1 class="page-title">Clinical Trials</h1>
            <div class="page-sub">Protocols, sites and phase milestones across trials</div>
          </div>
          <button class="btn btn-primary btn-create" (click)="openCreateTrialModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Create Trial
          </button>
        </div>

        <!-- Filter row -->
        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search trial code or indication">
          </div>
          <div class="filter-select">
            <svg class="funnel-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select aria-label="Filter by Status">
              <option value="">All</option>
              <option value="Draft">Draft</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Completed">Completed</option>
              <option value="Terminated">Terminated</option>
            </select>
            <svg class="caret-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>

        <!-- Table -->
        <div class="table-card">
          <div class="table-card-head">
            <h3>All Trials <span class="count">· {{ trials().length }} total</span></h3>
          </div>
          <div class="table-scroll">
            <table class="table-fixed">
              <thead>
                <tr>
                  <th style="width:15%;">Trial Code</th>
                  <th style="width:16%;">Product</th>
                  <th style="width:17%;">Indication</th>
                  <th style="width:11%;">Phase</th>
                  <th style="width:12%;">Planned Subjects</th>
                  <th style="width:13%;">Start Date</th>
                  <th style="width:10%;">Status</th>
                  <th style="width:80px;">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let trial of paginatedTrials()">
                  <td>
                    <div class="name-cell" style="color:var(--accent-dark);">{{ trial.trialCode }}</div>
                  </td>
                  <td>{{ getProductName(trial.productId) }}</td>
                  <td>{{ trial.indication }}</td>
                  <td><span class="phase-pill">{{ trial.phase }}</span></td>
                  <td class="mono">{{ trial.plannedSubjects }}</td>
                  <td>{{ trial.startDate }}</td>
                  <td>
                    <span class="badge-status"
                      [class.badge-draft]="trial.status === 'Draft'"
                      [class.badge-active]="trial.status === 'Active' || trial.status === 'Approved'"
                      [class.badge-suspended]="trial.status === 'Suspended'"
                      [class.badge-completed]="trial.status === 'Completed'"
                      [class.badge-terminated]="trial.status === 'Terminated'">
                      {{ trial.status }}
                    </span>
                  </td>
                  <td>
                    <div class="dropdown">
                      <button type="button" class="icon-menu-btn" aria-label="Row actions">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                      </button>
                      <div class="dropdown-menu dropdown-menu-right">
                        <button type="button" class="dropdown-item" (click)="viewTrialDetails(trial)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                          View
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="trials().length === 0">
                  <td colspan="8" class="empty-state">No clinical trials registered.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="table-footer" *ngIf="trials().length > 0">
            <div>Page {{ page() }} of {{ totalPages() }} · {{ trials().length }} records</div>
            <div class="pager">
              <button [disabled]="page() === 1" (click)="page.set(page() - 1)" aria-label="Previous page">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span style="padding:0 6px;">{{ page() }} / {{ totalPages() }}</span>
              <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" aria-label="Next page">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= DETAIL VIEW: SIDE-BY-SIDE TABS ================= -->
      <div *ngIf="selectedTrial()">
        <div class="breadcrumb">
          <a (click)="selectedTrial.set(null)" style="cursor:pointer;">Trials</a> / <b>{{ selectedTrial().trialCode }}</b>
        </div>

        <div class="page-head">
          <div>
            <h1 class="page-title">Trial Protocol: {{ selectedTrial().trialCode }}</h1>
            <div class="page-sub">{{ selectedTrial().indication }} · {{ selectedTrial().phase }}</div>
          </div>
          <button class="btn btn-secondary" (click)="selectedTrial.set(null)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Registry
          </button>
        </div>

        <!-- Status + workflow controls -->
        <div class="trial-status-row">
          <div class="detail-field">
            <label>Status</label>
            <span class="badge-status"
              [class.badge-draft]="selectedTrial().status === 'Draft'"
              [class.badge-active]="selectedTrial().status === 'Active' || selectedTrial().status === 'Approved'"
              [class.badge-suspended]="selectedTrial().status === 'Suspended'"
              [class.badge-completed]="selectedTrial().status === 'Completed'"
              [class.badge-terminated]="selectedTrial().status === 'Terminated'">
              {{ selectedTrial().status }}
            </span>
          </div>
          <div class="detail-field"><label>Planned Subjects</label><div class="value">{{ selectedTrial().plannedSubjects }}</div></div>
          <div class="detail-field"><label>Start</label><div class="value">{{ selectedTrial().startDate }}</div></div>
          <div class="detail-field"><label>End</label><div class="value">{{ selectedTrial().endDate }}</div></div>
          <div class="detail-field"><label>PI ID</label><div class="value">{{ selectedTrial().principalInvestigatorId }}</div></div>

          <div class="status-action-btns">
            <!-- Draft: show Send only (Draft -> Active) -->
            <button class="btn btn-primary btn-sm" *ngIf="selectedTrial().status === 'Draft'" (click)="openSignatureModal('Approved')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              Send
            </button>

            <!-- Active/Approved: Filter dropdown with Suspended, Completed, Terminated -->
            <div class="workflow-dropdown-group" *ngIf="selectedTrial().status === 'Active' || selectedTrial().status === 'Approved'">
              <label>Transition</label>
              <select (change)="onStatusChangeSelect($event)">
                <option value="">-- Choose Status --</option>
                <option value="Suspended">Suspended</option>
                <option value="Completed">Completed</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
            <!-- Completed / Terminated: no Send, no Filter -->
          </div>
        </div>

        <!-- Inline tab bar (switches on the same page, no navigation) -->
        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'protocol'" (click)="detailTab.set('protocol')">Protocol</button>
          <button [class.active]="detailTab() === 'sites'" (click)="detailTab.set('sites')">Site</button>
          <button [class.active]="detailTab() === 'history'" (click)="detailTab.set('history')">Workflow Log</button>
        </div>

        <div class="tab-card">
          <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
          <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

          <!-- PROTOCOL TAB (default) -->
          <div class="detail-grid" *ngIf="detailTab() === 'protocol'">
            <div class="detail-field"><label>Product under Test</label><div class="value">{{ getProductName(selectedTrial().productId) }}</div></div>
            <div class="detail-field"><label>Primary Indication</label><div class="value">{{ selectedTrial().indication }}</div></div>
            <div class="detail-field"><label>Phase</label><div class="value">{{ selectedTrial().phase }}</div></div>
            <div class="detail-field"><label>Planned Sample Size</label><div class="value">{{ selectedTrial().plannedSubjects }} subjects</div></div>
            <div class="detail-field"><label>Proposed Start Date</label><div class="value">{{ selectedTrial().startDate }}</div></div>
            <div class="detail-field"><label>Proposed End Date</label><div class="value">{{ selectedTrial().endDate }}</div></div>
            <div class="detail-field"><label>Principal Investigator ID</label><div class="value">User ID {{ selectedTrial().principalInvestigatorId }}</div></div>
          </div>

          <!-- SITE TAB -->
          <div *ngIf="detailTab() === 'sites'">
            <div class="section-head">
              <h3>Associated Investigation Sites</h3>
              <button class="btn btn-primary btn-sm" (click)="openAddSiteModal()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                Map Site
              </button>
            </div>
            <div class="section-box">
              <table class="mini-table">
                <thead>
                  <tr>
                    <th>Site Name</th>
                    <th>Country</th>
                    <th>Planned Subjects</th>
                    <th>Site Investigator</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let ts of trialSites()">
                    <td style="font-weight:700;">{{ getSiteName(ts.siteId) }}</td>
                    <td>{{ getSiteCountry(ts.siteId) }}</td>
                    <td>{{ ts.plannedSubjects }}</td>
                    <td>Investigator ID: {{ ts.principalInvestigatorId }}</td>
                    <td>
                      <span class="badge-status" [class.badge-active]="ts.status === 'ACTIVE'" [class.badge-progress]="ts.status !== 'ACTIVE'">
                        {{ ts.status }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="trialSites().length === 0">
                    <td colspan="5" class="empty-state">No sites mapped to this study protocol yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- WORKFLOW LOG TAB -->
          <div *ngIf="detailTab() === 'history'">
            <div class="section-head">
              <h3>Electronic Signature Verification Logs</h3>
            </div>
            <div class="section-box">
              <table class="mini-table">
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
                    <td class="hash-cell" [title]="s.signatureHash">{{ s.signatureHash }}</td>
                  </tr>
                  <tr *ngIf="signatureHistory().length === 0">
                    <td colspan="5" class="empty-state">No electronic signatures applied to this record yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════ MODALS ══════════════ -->

      <!-- 1. CREATE TRIAL MODAL -->
      <div class="modal-overlay" *ngIf="showCreateTrialModal()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="closeWithConfirm(showCreateTrialModal)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div class="modal-head-row">
            <div>
              <h2>Create Trial</h2>
              <div class="page-sub" style="margin-top:0;">Define trial phase, indication and planned enrolment</div>
            </div>
          </div>
          <form (ngSubmit)="handleCreateTrial()">
            <div class="form-grid">
              <div class="field full">
                <label>Trial Code (Auto-Generated)</label>
                <input type="text" name="trialCode" [value]="createTrialForm.trialCode" disabled>
              </div>
              <div class="field">
                <label>Target Product<span class="req">*</span></label>
                <select name="productId" [(ngModel)]="createTrialForm.productId" required>
                  <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Study Phase<span class="req">*</span></label>
                <select name="phase" [(ngModel)]="createTrialForm.phase" required>
                  <option value="PHASE_I">Phase I</option>
                  <option value="PHASE_II">Phase II</option>
                  <option value="PHASE_III">Phase III</option>
                  <option value="PHASE_IV">Phase IV</option>
                </select>
              </div>
              <div class="field full">
                <label>Indication / Condition<span class="req">*</span></label>
                <input type="text" name="indication" [(ngModel)]="createTrialForm.indication" placeholder="e.g. Type II Diabetes Mellitus" required>
              </div>
              <div class="field">
                <label>Planned Subjects Count<span class="req">*</span></label>
                <input type="number" name="planned" [(ngModel)]="createTrialForm.plannedSubjects" required>
              </div>
              <div class="field">
                <label>Principal Investigator ID<span class="req">*</span></label>
                <input type="number" name="piId" [(ngModel)]="createTrialForm.principalInvestigatorId" placeholder="Investigator Staff ID" required>
              </div>
              <div class="field">
                <label>Start Date<span class="req">*</span></label>
                <input type="date" name="startDate" [(ngModel)]="createTrialForm.startDate" required>
              </div>
              <div class="field">
                <label>End Date<span class="req">*</span></label>
                <input type="date" name="endDate" [(ngModel)]="createTrialForm.endDate" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Create Protocol</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. MAP SITE MODAL -->
      <div class="modal-overlay" *ngIf="showAddSiteModal()">
        <div class="modal" style="max-width:620px;">
          <button type="button" class="modal-close-x" (click)="closeWithConfirm(showAddSiteModal)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div class="modal-head-row">
            <div>
              <h2>Map Site to Study Protocol</h2>
              <div class="page-sub" style="margin-top:0;">Associate an investigation site and its enrolment plan</div>
            </div>
          </div>
          <form (ngSubmit)="handleMapSite()">
            <div class="form-grid">
              <div class="field full">
                <label>Select Site Directory<span class="req">*</span></label>
                <select name="siteId" [(ngModel)]="addSiteForm.siteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }} ({{ s.country }})</option>
                </select>
              </div>
              <div class="field">
                <label>Planned Subject Cohort<span class="req">*</span></label>
                <input type="number" name="cohort" [(ngModel)]="addSiteForm.plannedSubjects" required>
              </div>
              <div class="field">
                <label>Principal Investigator ID<span class="req">*</span></label>
                <input type="number" name="sitePi" [(ngModel)]="addSiteForm.principalInvestigatorId" placeholder="PI User ID" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Associate Site</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 3. ELECTRONIC SIGNATURE DIALOG -->
      <div class="modal-overlay" *ngIf="showSignatureModal()">
        <div class="modal" style="max-width:460px;">
          <button type="button" class="modal-close-x" (click)="closeWithConfirm(showSignatureModal)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <div class="modal-head-row">
            <div>
              <h2>Electronic Signature Verification</h2>
              <div class="page-sub" style="margin-top:0;">Apply a legally binding electronic signature</div>
            </div>
          </div>
          <div class="sig-list">
            <p style="margin:0 0 6px;font-size:13.5px;color:var(--text-dim);line-height:1.55;">You are applying a legally binding electronic signature to transition this study record.</p>
            <div class="row"><span class="label">Action</span><span>Transition to <strong>{{ targetStatus() }}</strong></span></div>
            <div class="row"><span class="label">Reasoning</span><span>APPROVED</span></div>
            <div class="row"><span class="label">Meaning</span><span>APPROVED</span></div>
          </div>
          <form (ngSubmit)="executeSignatureTransition()">
            <div class="field">
              <label>Verify Identity Password</label>
              <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
            </div>
            <div class="modal-footer">
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
    /* Status badge colours not provided by the global design system */
    .badge-draft{background:#eef0ef;color:#3c463f;}
    .badge-suspended{background:var(--warning-light);color:var(--warning);}
    .badge-completed{background:var(--blue-light);color:var(--blue);}
    .badge-terminated{background:var(--danger-light);color:var(--danger);}

    /* Small inline pills */
    .phase-pill{display:inline-block;background:var(--blue-light);color:var(--blue);padding:4px 11px;border-radius:20px;font-weight:600;font-size:12px;}
    .role-pill{display:inline-block;background:var(--accent-light);color:var(--accent-dark);padding:4px 11px;border-radius:20px;font-weight:600;font-size:12px;}

    /* Row-action dropdown: reveal on hover / keyboard focus (no extra state) */
    .dropdown:hover .dropdown-menu,
    .dropdown:focus-within .dropdown-menu{display:block;}

    /* Detail view: trial status summary card */
    .trial-status-row{display:flex;align-items:center;gap:28px;flex-wrap:wrap;margin:8px 0 6px;padding:20px 22px;background:#fbfaf8;border:1px solid var(--border);border-radius:var(--radius-md);}
    .status-action-btns{display:flex;align-items:center;gap:10px;margin-left:auto;flex-wrap:wrap;}
    .btn-sm{padding:8px 14px;font-size:13px;}

    /* Workflow transition dropdown */
    .workflow-dropdown-group{display:flex;align-items:center;gap:10px;}
    .workflow-dropdown-group label{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);}
    .workflow-dropdown-group select{border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;font-size:14px;background:#fff;color:var(--text);font-family:inherit;}

    /* Inline tab bar (side-by-side tabs, switch on same page) */
    .detail-tabs{display:flex;gap:4px;margin:28px 0 20px;border-bottom:1px solid var(--border);}
    .detail-tabs button{background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;padding:12px 18px;font-size:14px;font-weight:600;color:var(--text-dim);cursor:pointer;font-family:inherit;transition:color .15s ease,border-color .15s ease;}
    .detail-tabs button:hover{color:var(--accent-dark);}
    .detail-tabs button.active{color:var(--accent);border-bottom-color:var(--accent);}
    .tab-card{padding-top:4px;}

    /* Section headers inside tabs */
    .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .section-head h3{margin:0;font-size:16px;font-weight:800;}

    /* Mini table used within detail tabs */
    .section-box{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}
    .mini-table{width:100%;border-collapse:collapse;}
    .mini-table th{text-align:left;padding:12px 18px;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--text-dim);text-transform:uppercase;background:#fbfaf8;border-bottom:1px solid var(--border);}
    .mini-table td{padding:14px 18px;font-size:14.5px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle;}
    .mini-table tr:last-child td{border-bottom:none;}
    .hash-cell{font-family:monospace;font-size:11px;max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}

    /* Empty state row */
    .empty-state{padding:34px 20px;text-align:center;color:var(--text-dim);font-size:14px;font-style:italic;}

    /* Inline alerts */
    .alert{padding:11px 16px;border-radius:var(--radius-md);margin-bottom:18px;font-size:13.5px;}
    .alert-error{background:var(--danger-light);color:var(--danger);border:1px solid #f5c2c0;}
    .alert-success{background:#e8f5e9;color:#2e7d32;border:1px solid #c8e6c9;}

    /* Signature dialog detail list */
    .sig-list{display:flex;flex-direction:column;gap:10px;margin:4px 0 20px;font-size:14px;}
    .sig-list .row{display:flex;gap:10px;}
    .sig-list .label{font-weight:700;color:var(--text-dim);min-width:90px;}

    /* Modal head spacing tweak */
    .modal .modal-head-row{margin-bottom:22px;}

    /* Funnel status filter dropdown */
    .filter-select{position:relative;display:inline-flex;align-items:center;min-width:200px;}
    .filter-select .funnel-ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select .caret-ico{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;width:100%;border:1px solid var(--border);border-radius:var(--radius-sm);padding:11px 36px 11px 38px;font-size:14px;background:transparent;color:var(--text);font-family:inherit;cursor:pointer;}
    .filter-select select:focus{outline:none;border-color:var(--accent);}
  `]
})
export class TrialsComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  trials = signal<any[]>([]);
  products = signal<any[]>([]);
  sites = signal<any[]>([]);

  // Master selection
  selectedTrial = signal<any | null>(null);
  detailTab = signal<'protocol' | 'sites' | 'history'>('protocol');

  // Sub-data inside detail tabs
  trialSites = signal<any[]>([]);
  signatureHistory = signal<any[]>([]);

  // Pagination states
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  // Modals Visibility
  showCreateTrialModal = signal<boolean>(false);
  showAddSiteModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // Form Models
  createTrialForm = {
    trialCode: '',
    productId: null as any,
    phase: 'PHASE_I',
    indication: '',
    plannedSubjects: 100,
    startDate: '',
    endDate: '',
    principalInvestigatorId: 1
  };

  addSiteForm = {
    siteId: null as any,
    plannedSubjects: 50,
    principalInvestigatorId: 1,
    status: 'ACTIVE'
  };

  // Electronic signature temp vars
  signaturePassword = '';
  targetStatus = signal<string>('');
  signing = signal<boolean>(false);

  ngOnInit() {
    this.fetchProducts();
    this.fetchSites();
    this.fetchTrials();
  }

  fetchTrials() {
    this.apiService.getAllTrials().subscribe({
      next: (data) => {
        this.trials.set(data || []);
        this.totalPages.set(Math.ceil(data.length / this.pageSize) || 1);
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching clinical trials log')
    });
  }

  fetchProducts() {
    this.apiService.getProducts().subscribe({
      next: (res) => {
        if (res.success) {
          this.products.set(res.data || []);
        }
      }
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

  paginatedTrials() {
    const start = (this.page() - 1) * this.pageSize;
    return this.trials().slice(start, start + this.pageSize);
  }

  getProductName(productId: number): string {
    const p = this.products().find(item => item.productId === productId);
    return p ? p.productName : `Prod ID: ${productId}`;
  }

  getSiteName(siteId: number): string {
    const s = this.sites().find(item => item.siteId === siteId);
    return s ? s.siteName : `Site ID: ${siteId}`;
  }

  getSiteCountry(siteId: number): string {
    const s = this.sites().find(item => item.siteId === siteId);
    return s ? s.country : 'None';
  }

  viewTrialDetails(trial: any) {
    this.selectedTrial.set(trial);
    this.detailTab.set('protocol');
    this.clearMessages();
    this.fetchTrialSites(trial.trialId);
    this.fetchSignatureHistory(trial.trialCode);
  }

  fetchTrialSites(trialId: number) {
    this.apiService.getTrialSites(trialId).subscribe({
      next: (data) => this.trialSites.set(data || []),
      error: () => this.trialSites.set([])
    });
  }

  fetchSignatureHistory(trialCode: string) {
    this.apiService.getSignatures('TrialProtocol', trialCode).subscribe({
      next: (res) => {
        if (res.success) {
          this.signatureHistory.set(res.data || []);
        }
      },
      error: () => this.signatureHistory.set([])
    });
  }

  openCreateTrialModal() {
    // Generate code automatically to avoid user typing databases IDs
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.createTrialForm = {
      trialCode: `TRIAL-${randomSuffix}`,
      productId: this.products()[0]?.productId || null,
      phase: 'PHASE_I',
      indication: '',
      plannedSubjects: 120,
      startDate: new Date().toISOString().substring(0, 10),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      principalInvestigatorId: Number(localStorage.getItem('pt_userId')) || 1
    };
    this.showCreateTrialModal.set(true);
    this.clearMessages();
  }

  handleCreateTrial() {
    this.apiService.createTrial(this.createTrialForm).subscribe({
      next: () => {
        this.showSuccess('Clinical study protocol registered successfully in Draft state.');
        this.showCreateTrialModal.set(false);
        this.fetchTrials();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to register protocol.')
    });
  }

  openAddSiteModal() {
    this.addSiteForm = {
      siteId: this.sites()[0]?.siteId || null,
      plannedSubjects: 40,
      principalInvestigatorId: 2,
      status: 'ACTIVE'
    };
    this.showAddSiteModal.set(true);
    this.clearMessages();
  }

  handleMapSite() {
    const trialId = this.selectedTrial().trialId;
    this.apiService.createTrialSite(trialId, this.addSiteForm).subscribe({
      next: () => {
        this.showSuccess('Site associated with clinical trial successfully.');
        this.showAddSiteModal.set(false);
        this.fetchTrialSites(trialId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to associate site.')
    });
  }

  openSignatureModal(target: string) {
    this.targetStatus.set(target);
    this.signaturePassword = '';
    this.showSignatureModal.set(true);
    this.clearMessages();
  }

  onStatusChangeSelect(e: any) {
    const val = e.target.value;
    if (val) {
      this.openSignatureModal(val);
      e.target.value = ''; // Reset select
    }
  }

  executeSignatureTransition() {
    this.signing.set(true);
    this.clearMessages();

    // CFR 21 Part 11 Electronic Signature creation:
    // POST /pharmaTrack/identityAccess/signatures
    const signaturePayload = {
      entityType: 'TrialProtocol',
      entityId: this.selectedTrial().trialCode,
      entityVersion: '1',
      meaning: 'APPROVED'
    };

    // First sign
    this.apiService.signEntity(signaturePayload).subscribe({
      next: (res) => {
        if (res.success) {
          // Then call the workflow transition:
          // POST /pharmaTrack/clinicalTrial/workflow/transition
          const transitionPayload = {
            entityType: 'TrialProtocol',
            entityId: this.selectedTrial().trialCode,
            targetStatus: this.targetStatus(),
            reason: `Protocol transition to ${this.targetStatus()} with Electronic Signature ID ${res.data?.signatureId}`
          };

          this.apiService.transitionWorkflow('clinicalTrial', transitionPayload).subscribe({
            next: () => {
              this.signing.set(false);
              this.showSignatureModal.set(false);
              this.showSuccess(`Trial state successfully transitioned to: ${this.targetStatus()}`);

              // Reload details
              const updatedTrial = { ...this.selectedTrial(), status: this.targetStatus() };
              this.selectedTrial.set(updatedTrial);
              this.fetchTrials();
              this.fetchSignatureHistory(updatedTrial.trialCode);
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
