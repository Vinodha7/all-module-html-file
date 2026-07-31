import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-deviations-capa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="deviations-page">

      <!-- ============ MASTER VIEW: Deviations list ============ -->
      <div *ngIf="!selectedDeviation()">
        <div class="page-head">
          <div>
            <h2 class="page-title">Deviation &amp; CAPA Management</h2>
            <p class="page-sub">Log discrepancies, assess impact levels, and launch CAPA correction procedures.</p>
          </div>
          <div class="spacer"></div>
          <button class="btn btn-primary btn-create" (click)="openCreateDeviationModal()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Create Deviation
          </button>
        </div>

        <!-- Filter row -->
        <div class="filter-row">
          <div class="input-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg>
            <input type="text" placeholder="Search deviations, entities, owners…">
          </div>
          <div class="filter-select">
            <svg class="funnel" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select aria-label="Filter by Status">
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="CAPA Created">CAPA Created</option>
              <option value="Closed">Closed</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <!-- Table -->
        <div class="table-card">
          <div class="table-card-head">
            <h3>Deviation Log</h3>
            <span class="count">· {{ deviations().length }} total</span>
          </div>
          <div class="table-scroll">
            <table class="table-fixed">
              <thead>
                <tr>
                  <th style="width:26%">Reason</th>
                  <th style="width:16%">Related Entity</th>
                  <th style="width:14%">Detection Date</th>
                  <th style="width:14%">Detected By</th>
                  <th style="width:9%">Impact</th>
                  <th style="width:12%">Status</th>
                  <th style="width:9%">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let dev of paginatedDeviations()">
                  <!-- Reason: text only, tooltip = Deviation Code -->
                  <td>
                    <span class="tooltip name-cell">
                      {{ dev.description | slice:0:40 }}{{ dev.description.length > 40 ? '…' : '' }}
                      <span class="tooltiptext">Code: {{ dev.deviationId }}</span>
                    </span>
                  </td>
                  <!-- Related Entity: entity name only, tooltip = business identifier -->
                  <td>
                    <span class="tooltip">
                      {{ dev.relatedEntityType }}
                      <span class="tooltiptext">ID: {{ dev.relatedEntityId }}</span>
                    </span>
                  </td>
                  <td>{{ dev.detectionDate }}</td>
                  <td class="mono">Staff ID: {{ dev.detectedById }}</td>
                  <!-- Impact: icon only, tooltip = severity -->
                  <td>
                    <span class="tooltip impact-icon">
                      <span *ngIf="dev.impact === 'Minor'" class="impact-minor">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>
                      </span>
                      <span *ngIf="dev.impact === 'Major'" class="impact-major">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
                      </span>
                      <span *ngIf="dev.impact === 'Critical'" class="impact-critical">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                      </span>
                      <span class="tooltiptext">Impact: {{ dev.impact }}</span>
                    </span>
                  </td>
                  <td>
                    <span class="badge-status"
                      [class.badge-progress]="dev.status === 'Open'"
                      [class.badge-submitted]="dev.status === 'Under Investigation'"
                      [class.badge-rust]="dev.status === 'CAPA Created'"
                      [class.badge-closed]="dev.status === 'Closed' || dev.status === 'CLS'">
                      {{ dev.status }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-outline btn-sm" (click)="viewDeviationDetails(dev)">View</button>
                  </td>
                </tr>
                <tr *ngIf="deviations().length === 0">
                  <td colspan="7" class="empty-state">No deviations logged.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="table-footer" *ngIf="deviations().length > 0">
            <span>Page {{ page() }} of {{ totalPages() }}</span>
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

      <!-- ============ DETAIL VIEW ============ -->
      <div *ngIf="selectedDeviation()">
        <div class="breadcrumb">
          <a (click)="selectedDeviation.set(null)">Deviations</a> &nbsp;/&nbsp; <b>{{ selectedDeviation().deviationId }}</b>
        </div>

        <div class="detail-head-row">
          <button class="btn btn-secondary btn-sm" (click)="selectedDeviation.set(null)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Registry
          </button>
          <div class="detail-title-wrap">
            <h2 class="page-title">Deviation: {{ selectedDeviation().deviationId }}</h2>
            <span class="badge-status"
              [class.badge-progress]="selectedDeviation().status === 'Open'"
              [class.badge-submitted]="selectedDeviation().status === 'Under Investigation'"
              [class.badge-rust]="selectedDeviation().status === 'CAPA Created'"
              [class.badge-closed]="selectedDeviation().status === 'Closed' || selectedDeviation().status === 'CLS'">
              {{ selectedDeviation().status }}
            </span>
          </div>
          <div class="spacer"></div>
          <div class="workflow-controls" *ngIf="selectedDeviation().status !== 'Closed'">
            <button class="btn btn-primary" *ngIf="selectedDeviation().status === 'Open'" (click)="updateDeviationStatus('Under Investigation')">
              Start Investigation
            </button>
          </div>
        </div>

        <!-- Top-level tabs -->
        <div class="tab-bar">
          <button class="tab-btn" [class.active]="detailTab() === 'details'" (click)="detailTab.set('details')">Deviation Details</button>
          <button class="tab-btn" [class.active]="detailTab() === 'capa'" (click)="detailTab.set('capa')">CAPA Records</button>
          <button class="tab-btn" [class.active]="detailTab() === 'signatures'" (click)="detailTab.set('signatures')">Workflow Signatures</button>
        </div>

        <div class="table-card tab-panel">
          <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
          <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

          <!-- 1. DEVIATION DETAILS TAB -->
          <div *ngIf="detailTab() === 'details'" class="detail-grid">
            <div class="detail-field"><label>Deviation Code</label><div class="value">{{ selectedDeviation().deviationId }}</div></div>
            <div class="detail-field"><label>Detection Date</label><div class="value">{{ selectedDeviation().detectionDate }}</div></div>
            <div class="detail-field"><label>Related Entity Type</label><div class="value">{{ selectedDeviation().relatedEntityType }}</div></div>
            <div class="detail-field"><label>Related Entity ID / Code</label><div class="value">{{ selectedDeviation().relatedEntityId }}</div></div>
            <div class="detail-field"><label>Impact Severity</label><div class="value">{{ selectedDeviation().impact }}</div></div>
            <div class="detail-field"><label>Logged By Staff ID</label><div class="value">{{ selectedDeviation().detectedById }}</div></div>
            <div class="detail-field" style="grid-column:1 / -1">
              <label>Detailed Deviation Reason</label>
              <p class="description-text">{{ selectedDeviation().description }}</p>
            </div>
          </div>

          <!-- 2. CAPA RECORDS TAB -->
          <div *ngIf="detailTab() === 'capa'">
            <div class="tab-action-bar">
              <h3>Corrective &amp; Preventive Actions</h3>
              <div class="spacer"></div>
              <button class="btn btn-primary btn-sm" (click)="openCreateCapaModal()" [disabled]="selectedDeviation().status === 'Closed'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Create CAPA
              </button>
            </div>

            <div class="capa-list">
              <div class="capa-card" *ngFor="let capa of capas()">
                <div class="capa-card-head">
                  <h4>CAPA Code: {{ capa.capaId }}</h4>
                  <div class="capa-head-actions">
                    <span class="badge-status"
                      [class.badge-closed]="capa.status === 'Closed'"
                      [class.badge-progress]="capa.status !== 'Closed'">
                      {{ capa.status }}
                    </span>
                    <button class="btn btn-outline btn-sm" *ngIf="capa.status !== 'Closed'" (click)="openSignatureModal(capa)">
                      Sign &amp; Close
                    </button>
                  </div>
                </div>

                <!-- CAPA sub-tabs: Details, Actions, Evidence, History -->
                <div class="subtab-bar">
                  <button class="subtab-btn" [class.active]="capaTabs[capa.capaId] === 'details'" (click)="capaTabs[capa.capaId] = 'details'">Details</button>
                  <button class="subtab-btn" [class.active]="capaTabs[capa.capaId] === 'actions'" (click)="capaTabs[capa.capaId] = 'actions'">Actions</button>
                  <button class="subtab-btn" [class.active]="capaTabs[capa.capaId] === 'evidence'" (click)="capaTabs[capa.capaId] = 'evidence'">Evidence</button>
                  <button class="subtab-btn" [class.active]="capaTabs[capa.capaId] === 'history'" (click)="capaTabs[capa.capaId] = 'history'">History</button>
                </div>

                <div class="subtab-content">
                  <!-- Details -->
                  <div *ngIf="capaTabs[capa.capaId] === 'details'" class="detail-grid">
                    <div class="detail-field"><label>Assigned To Staff ID</label><div class="value">{{ capa.assignedToId }}</div></div>
                    <div class="detail-field"><label>Target Due Date</label><div class="value">{{ capa.dueDate }}</div></div>
                    <div class="detail-field"><label>Investigation Root Cause</label><div class="value">{{ capa.rootCause }}</div></div>
                    <div class="detail-field" *ngIf="capa.closedDate"><label>Closed Date</label><div class="value">{{ capa.closedDate }}</div></div>
                  </div>

                  <!-- Actions -->
                  <div *ngIf="capaTabs[capa.capaId] === 'actions'" class="detail-grid">
                    <div class="detail-field" style="grid-column:1 / -1">
                      <label>Corrective Action Plan (CAP)</label>
                      <p class="description-text">{{ capa.correctiveAction }}</p>
                    </div>
                    <div class="detail-field" style="grid-column:1 / -1">
                      <label>Preventive Action Plan (PAP)</label>
                      <p class="description-text">{{ capa.preventiveAction }}</p>
                    </div>
                  </div>

                  <!-- Evidence -->
                  <div *ngIf="capaTabs[capa.capaId] === 'evidence'">
                    <p class="subtab-note">Verification Evidence Manifest &amp; Attachments</p>
                    <div class="evidence-block">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>
                      Corrective verification trial audit log signed. Integrity checked intact.
                    </div>
                  </div>

                  <!-- History -->
                  <div *ngIf="capaTabs[capa.capaId] === 'history'">
                    <p class="subtab-note">Electronic Signature History for this CAPA</p>
                    <div class="table-scroll">
                      <table>
                        <thead>
                          <tr><th>Signer</th><th>Meaning</th><th>Ver.</th><th>Signed At</th></tr>
                        </thead>
                        <tbody>
                          <ng-container *ngFor="let s of signatureHistory()">
                            <tr *ngIf="s.entityId === capa.capaId">
                              <td>{{ s.signerName }}</td>
                              <td><span class="badge-status badge-rust">{{ s.meaning }}</span></td>
                              <td>v{{ s.entityVersion }}</td>
                              <td>{{ s.signedAt | date:'medium' }}</td>
                            </tr>
                          </ng-container>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="capas().length === 0" class="empty-state boxed">
                No CAPA procedures initialized for this deviation.
              </div>
            </div>
          </div>

          <!-- 3. WORKFLOW SIGNATURES TAB -->
          <div *ngIf="detailTab() === 'signatures'">
            <div class="tab-action-bar"><h3>Electronic Signature History</h3></div>
            <div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Signer</th>
                    <th>Meaning</th>
                    <th>Ver.</th>
                    <th>Signed At</th>
                    <th>SHA-256 Checksum</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of signatureHistory()">
                    <td class="name-cell">{{ s.entityId }} ({{ s.entityType }})</td>
                    <td>{{ s.signerName }}</td>
                    <td><span class="badge-status badge-rust">{{ s.meaning }}</span></td>
                    <td>v{{ s.entityVersion }}</td>
                    <td>{{ s.signedAt | date:'medium' }}</td>
                    <td class="hash-cell" [title]="s.signatureHash">{{ s.signatureHash }}</td>
                  </tr>
                  <tr *ngIf="signatureHistory().length === 0">
                    <td colspan="6" class="empty-state">No electronic signatures applied to these records.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════ MODALS ══════════════ -->

      <!-- 1. CREATE DEVIATION MODAL -->
      <div class="modal-overlay" *ngIf="showCreateDeviationModal()">
        <div class="modal">
          <button class="modal-close-x" (click)="confirmDiscard() && showCreateDeviationModal.set(false)" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2>Create Deviation Log</h2>
          <p class="modal-sub">Log a quality deviation with impact assessment</p>
          <form (ngSubmit)="handleCreateDeviation()">
            <div class="form-grid">
              <div class="field">
                <label>Deviation Code</label>
                <input type="text" name="deviationId" [value]="createDeviationForm.deviationId" disabled>
                <span class="autofill-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Auto-generated
                </span>
              </div>
              <div class="field">
                <label>Related Entity Type <span class="req">*</span></label>
                <select name="relType" [(ngModel)]="createDeviationForm.relatedEntityType" required>
                  <option value="BatchRecord">Manufacturing Batch (BatchRecord)</option>
                  <option value="DrugShipment">Supply Shipment (DrugShipment)</option>
                  <option value="TrialProtocol">Clinical Study (TrialProtocol)</option>
                </select>
              </div>
              <div class="field">
                <label>Related Entity ID / Code <span class="req">*</span></label>
                <input type="text" name="relId" [(ngModel)]="createDeviationForm.relatedEntityId" placeholder="e.g. BATCH-8012" required>
              </div>
              <div class="field">
                <label>Impact Severity <span class="req">*</span></label>
                <select name="impact" [(ngModel)]="createDeviationForm.impact" required>
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div class="field">
                <label>Detected By Staff ID <span class="req">*</span></label>
                <input type="number" name="detBy" [(ngModel)]="createDeviationForm.detectedById" required>
              </div>
              <div class="field">
                <label>Detection Date <span class="req">*</span></label>
                <input type="date" name="detDate" [(ngModel)]="createDeviationForm.detectionDate" required>
              </div>
              <div class="field">
                <label>Status</label>
                <input type="text" name="status" value="Open" disabled>
              </div>
              <div class="field full">
                <label>Description (Reason) <span class="req">*</span></label>
                <input type="text" name="desc" [(ngModel)]="createDeviationForm.description" placeholder="Temperature excursion of +2°C noted during unloading." required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Log Deviation</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. CREATE CAPA MODAL -->
      <div class="modal-overlay" *ngIf="showCreateCapaModal()">
        <div class="modal">
          <button class="modal-close-x" (click)="confirmDiscard() && showCreateCapaModal.set(false)" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2>Create CAPA</h2>
          <p class="modal-sub">Add a corrective and preventive action plan</p>
          <form (ngSubmit)="handleCreateCapa()">
            <div class="form-grid">
              <div class="field">
                <label>CAPA Code</label>
                <input type="text" name="capaId" [value]="createCapaForm.capaId" disabled>
                <span class="autofill-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Auto-generated
                </span>
              </div>
              <div class="field">
                <label>Assigned Staff ID <span class="req">*</span></label>
                <input type="number" name="capaAss" [(ngModel)]="createCapaForm.assignedToId" required>
              </div>
              <div class="field">
                <label>Target Due Date <span class="req">*</span></label>
                <input type="date" name="capaDue" [(ngModel)]="createCapaForm.dueDate" required>
              </div>
              <div class="field full">
                <label>Investigation Root Cause <span class="req">*</span></label>
                <input type="text" name="capaRoot" [(ngModel)]="createCapaForm.rootCause" placeholder="Faulty temperature sensor battery calibration." required>
              </div>
              <div class="field full">
                <label>Corrective Action Plan (CAP) <span class="req">*</span></label>
                <input type="text" name="capaCorr" [(ngModel)]="createCapaForm.correctiveAction" placeholder="Replaced battery and re-calibrated sensors immediately." required>
              </div>
              <div class="field full">
                <label>Preventive Action Plan (PAP) <span class="req">*</span></label>
                <input type="text" name="capaPrev" [(ngModel)]="createCapaForm.preventiveAction" placeholder="Scheduled bi-monthly battery integrity verification pass." required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Initialize CAPA</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 3. ELECTRONIC SIGNATURE MODAL -->
      <div class="modal-overlay" *ngIf="showSignatureModal()">
        <div class="modal" style="max-width:460px">
          <button class="modal-close-x" (click)="confirmDiscard() && showSignatureModal.set(false)" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2>Electronic Signature</h2>
          <p class="modal-sub">Apply a legally binding e-signature to verify and CLOSE this CAPA record.</p>
          <div class="detail-grid" style="grid-template-columns:1fr 1fr;margin-bottom:20px">
            <div class="detail-field"><label>CAPA Code</label><div class="value">{{ selectedCapaForSign()?.capaId }}</div></div>
            <div class="detail-field"><label>Meaning</label><div class="value">APPROVED</div></div>
          </div>
          <form (ngSubmit)="executeSignatureTransition()">
            <div class="field">
              <label>Verify Identity Password <span class="req">*</span></label>
              <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary" [disabled]="signing()">
                {{ signing() ? 'Signing…' : 'Verify & Close' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .deviations-page { color: var(--text); }
    .spacer { flex: 1; }
    .btn-sm { padding: 7px 12px; font-size: 13px; }

    /* Status filter — single funnel dropdown */
    .filter-select {
      position: relative; display: inline-flex; align-items: center; gap: 8px;
      border: 1px solid var(--border); border-radius: var(--radius-sm);
      background: #fff; padding: 0 12px; min-width: 200px;
    }
    .filter-select .funnel { color: var(--text-dim); flex-shrink: 0; pointer-events: none; }
    .filter-select .caret { color: var(--text-dim); flex-shrink: 0; margin-left: auto; pointer-events: none; }
    .filter-select select {
      appearance: none; -webkit-appearance: none; -moz-appearance: none;
      border: none; background: transparent; outline: none;
      font-family: inherit; font-size: 14px; color: var(--text);
      padding: 11px 4px; flex: 1; width: 100%; cursor: pointer;
    }

    /* Tooltip — black background, white text, rounded corners */
    .tooltip { position: relative; display: inline-block; cursor: default; }
    .tooltip .tooltiptext {
      visibility: hidden; opacity: 0;
      position: absolute; z-index: 100;
      bottom: 135%; left: 50%; transform: translateX(-50%);
      background: #1e1008; color: #ffffff;
      padding: 6px 10px; border-radius: 8px;
      font-size: 11.5px; font-weight: 500; white-space: nowrap;
      box-shadow: 0 6px 16px rgba(0,0,0,.25);
      transition: opacity .15s ease;
      pointer-events: none;
    }
    .tooltip .tooltiptext::after {
      content: ""; position: absolute; top: 100%; left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #1e1008;
    }
    .tooltip:hover .tooltiptext { visibility: visible; opacity: 1; }

    /* Impact icons (icon-only, colour by severity) */
    .impact-icon { line-height: 0; }
    .impact-icon > span { display: inline-flex; }
    .impact-minor { color: #2f7d46; }
    .impact-major { color: var(--warning); }
    .impact-critical { color: var(--danger); }

    /* Closed badge (green) — not present in global palette */
    .badge-closed { background: #e4f3e9; color: #2f7d46; }

    .mono { color: var(--text-dim); font-variant-numeric: tabular-nums; }
    .empty-state { text-align: center; color: var(--text-dim); font-style: italic; padding: 30px !important; }
    .empty-state.boxed { border: 1px dashed var(--border); border-radius: var(--radius-md); }

    .pager button:disabled { opacity: .45; cursor: not-allowed; }

    /* Breadcrumb link */
    .breadcrumb a { cursor: pointer; }
    .breadcrumb a:hover { color: var(--accent); }

    /* Detail header */
    .detail-head-row { display: flex; align-items: center; gap: 16px; margin: 4px 0 22px; flex-wrap: wrap; }
    .detail-title-wrap { display: flex; align-items: center; gap: 12px; }
    .detail-title-wrap .page-title { font-size: 22px; margin: 0; }

    /* Top-level tabs */
    .tab-bar { display: flex; gap: 4px; margin-bottom: 18px; border-bottom: 1px solid var(--border); }
    .tab-btn {
      background: none; border: none; border-bottom: 2px solid transparent;
      padding: 11px 16px; font-family: inherit; font-size: 14px; font-weight: 600;
      color: var(--text-dim); cursor: pointer;
    }
    .tab-btn:hover { color: var(--accent-dark); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-panel { padding: 26px; }

    /* Sub-tabs (per CAPA) */
    .subtab-bar { display: flex; gap: 6px; margin: 12px 0; flex-wrap: wrap; }
    .subtab-btn {
      background: none; border: 1px solid transparent; border-radius: var(--radius-sm);
      padding: 6px 12px; font-family: inherit; font-size: 12.5px; font-weight: 600;
      color: var(--text-dim); cursor: pointer;
    }
    .subtab-btn:hover { color: var(--accent-dark); }
    .subtab-btn.active { background: var(--accent-light); color: var(--accent-dark); }
    .subtab-content { padding-top: 6px; }
    .subtab-note { font-size: 13px; color: var(--text-dim); margin: 0 0 10px; }

    .tab-action-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .tab-action-bar h3 { margin: 0; font-size: 17px; font-weight: 800; font-family: 'Manrope', sans-serif; }

    /* CAPA cards */
    .capa-list { display: flex; flex-direction: column; gap: 18px; }
    .capa-card { border: 1px solid var(--border); border-radius: var(--radius-md); padding: 18px 20px; background: #fff; }
    .capa-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
    .capa-card-head h4 { margin: 0; font-size: 15px; font-weight: 800; color: var(--accent-dark); font-family: 'Manrope', sans-serif; }
    .capa-head-actions { display: flex; align-items: center; gap: 12px; }

    .description-text {
      background: var(--bg); border: 1px solid var(--border);
      padding: 12px 14px; border-radius: var(--radius-sm);
      font-size: 14px; margin: 8px 0 0; line-height: 1.55;
    }
    .evidence-block {
      display: flex; align-items: center; gap: 10px;
      background: #e4f3e9; color: #2f7d46; border: 1px solid #c5e6d0;
      padding: 12px 14px; border-radius: var(--radius-sm);
      font-size: 13.5px; font-weight: 500;
    }
    .evidence-block svg { flex-shrink: 0; }

    .hash-cell { font-family: monospace; font-size: 11.5px; max-width: 230px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-dim); }

    /* Alerts */
    .alert { padding: 11px 15px; border-radius: var(--radius-sm); margin-bottom: 18px; font-size: 13.5px; }
    .alert-error { background: var(--danger-light); color: var(--danger); border: 1px solid #f3c9c6; }
    .alert-success { background: #e4f3e9; color: #2f7d46; border: 1px solid #c5e6d0; }

    /* Modal extras */
    .modal-sub { color: var(--text-dim); font-size: 14px; margin: 6px 0 24px; }
    .modal-footer { gap: 12px; }

    /* Nested tables inside tab panels */
    .subtab-content table thead th { padding: 10px 14px; }
    .subtab-content table tbody td { padding: 12px 14px; }
  `]
})
export class DeviationsComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  deviations = signal<any[]>([]);
  capas = signal<any[]>([]);
  signatureHistory = signal<any[]>([]);

  // Selection
  selectedDeviation = signal<any | null>(null);
  detailTab = signal<'details' | 'capa' | 'signatures'>('details');

  // Sub-tabs navigation helpers
  capaTabs: { [capaId: string]: string } = {};

  // Pagination states
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  // Modals Visibility
  showCreateDeviationModal = signal<boolean>(false);
  showCreateCapaModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // Form Models
  createDeviationForm = {
    deviationId: '',
    relatedEntityType: 'BatchRecord',
    relatedEntityId: '',
    description: '',
    detectedById: '1',
    detectionDate: '',
    impact: 'Minor',
    status: 'Open'
  };

  createCapaForm = {
    capaId: '',
    assignedToId: 1,
    dueDate: '',
    rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    status: 'Open'
  };

  // Electronic Signature closing details
  selectedCapaForSign = signal<any | null>(null);
  signaturePassword = '';
  signing = signal<boolean>(false);

  ngOnInit() {
    this.fetchDeviations();
  }

  fetchDeviations() {
    this.apiService.getDeviations().subscribe({
      next: (data) => {
        this.deviations.set(data || []);
        this.totalPages.set(Math.ceil(data.length / this.pageSize) || 1);
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching logged deviations ledger.')
    });
  }

  paginatedDeviations() {
    const start = (this.page() - 1) * this.pageSize;
    return this.deviations().slice(start, start + this.pageSize);
  }

  viewDeviationDetails(dev: any) {
    this.selectedDeviation.set(dev);
    this.detailTab.set('details');
    this.clearMessages();
    this.fetchCapas(dev.deviationId);
    this.fetchSignatureHistory(dev.deviationId);
  }

  fetchCapas(deviationId: string) {
    this.apiService.getCapasByDeviation(deviationId).subscribe({
      next: (data) => {
        this.capas.set(data || []);
        // Initialize sub-tabs states
        data.forEach(item => {
          if (!this.capaTabs[item.capaId]) {
            this.capaTabs[item.capaId] = 'details';
          }
        });
      },
      error: () => this.capas.set([])
    });
  }

  fetchSignatureHistory(deviationId: string) {
    // Merge signatures of deviation and its CAPAs
    this.apiService.getSignatures('CAPARecord', deviationId).subscribe({
      next: (res) => {
        if (res.success) {
          this.signatureHistory.set(res.data || []);
        }
      },
      error: () => this.signatureHistory.set([])
    });
  }

  openCreateDeviationModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.createDeviationForm = {
      deviationId: `DEV-${rand}`,
      relatedEntityType: 'BatchRecord',
      relatedEntityId: '',
      description: '',
      detectedById: '1',
      detectionDate: new Date().toISOString().substring(0, 10),
      impact: 'Minor',
      status: 'Open'
    };
    this.showCreateDeviationModal.set(true);
    this.clearMessages();
  }

  handleCreateDeviation() {
    this.apiService.createDeviation(this.createDeviationForm).subscribe({
      next: () => {
        this.showSuccess('Deviation recorded successfully in Open state.');
        this.showCreateDeviationModal.set(false);
        this.fetchDeviations();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to log deviation.')
    });
  }

  updateDeviationStatus(newStatus: string) {
    const devId = this.selectedDeviation().deviationId;
    this.apiService.updateDeviation(devId, { ...this.selectedDeviation(), status: newStatus }).subscribe({
      next: () => {
        this.showSuccess(`Deviation state transitioned to: ${newStatus}`);

        // Reload details
        const updatedDev = { ...this.selectedDeviation(), status: newStatus };
        this.selectedDeviation.set(updatedDev);
        this.fetchDeviations();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to update deviation state.')
    });
  }

  openCreateCapaModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.createCapaForm = {
      capaId: `CAPA-${rand}`,
      assignedToId: 1,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      rootCause: '',
      correctiveAction: '',
      preventiveAction: '',
      status: 'Open'
    };
    this.showCreateCapaModal.set(true);
    this.clearMessages();
  }

  handleCreateCapa() {
    const payload = {
      ...this.createCapaForm,
      deviationId: this.selectedDeviation().deviationId
    };

    this.apiService.createCapa(payload).subscribe({
      next: () => {
        this.showSuccess('CAPA corrective procedure initialized.');
        this.showCreateCapaModal.set(false);

        // Update deviation status to CAPA Created automatically
        this.updateDeviationStatus('CAPA Created');
        this.fetchCapas(payload.deviationId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to create CAPA.')
    });
  }

  openSignatureModal(capa: any) {
    this.selectedCapaForSign.set(capa);
    this.signaturePassword = '';
    this.showSignatureModal.set(true);
    this.clearMessages();
  }

  executeSignatureTransition() {
    this.signing.set(true);
    this.clearMessages();

    const capa = this.selectedCapaForSign();

    // Create closing signature:
    // POST /pharmaTrack/identityAccess/signatures
    const signaturePayload = {
      entityType: 'CAPARecord',
      entityId: capa.capaId,
      entityVersion: '1',
      meaning: 'APPROVED'
    };

    this.apiService.signEntity(signaturePayload).subscribe({
      next: (res) => {
        if (res.success) {
          // Transition CAPA workflow:
          // POST /pharmaTrack/deviationCapa/workflow/transition
          const transitionPayload = {
            entityType: 'CAPARecord',
            entityId: capa.capaId,
            targetStatus: 'CLS', // CLS maps to Closed in database
            reason: `CAPA closed successfully with Electronic Signature ID ${res.data?.signatureId}`
          };

          this.apiService.transitionWorkflow('deviationCapa', transitionPayload).subscribe({
            next: () => {
              this.signing.set(false);
              this.showSignatureModal.set(false);
              this.showSuccess('CAPA record successfully signed and closed.');

              // Reload details
              this.fetchCapas(this.selectedDeviation().deviationId);
              this.fetchSignatureHistory(this.selectedDeviation().deviationId);

              // Auto update deviation status to Closed when all CAPAs are closed
              setTimeout(() => {
                const openCapas = this.capas().filter(c => c.status !== 'Closed' && c.status !== 'CLS' && c.capaId !== capa.capaId);
                if (openCapas.length === 0) {
                  this.updateDeviationStatus('Closed');
                }
              }, 1000);
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

  confirmDiscard(): boolean {
    return window.confirm('Discard unsaved changes?');
  }
}
