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
    <div class="deviations-container">
      <!-- Master View: Deviations list -->
      <div class="master-panel" *ngIf="!selectedDeviation()">
        <div class="panel-header">
          <div>
            <h2>Deviation Registry & Investigation</h2>
            <p>Log discrepancies, check impact levels, and launch CAPA correction procedures.</p>
          </div>
          <div>
            <button class="btn btn-primary" (click)="openCreateDeviationModal()">+Create Deviation</button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Reason (Description)</th>
                <th>Related Entity</th>
                <th>Detection Date</th>
                <th>Detected By</th>
                <th>Impact</th>
                <th>Status</th>
                <th style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let dev of paginatedDeviations()">
                <!-- Tooltip: Reason displays description and deviationId as tooltip -->
                <td>
                  <span class="tooltip">
                    {{ dev.description | slice:0:30 }}{{ dev.description.length > 30 ? '...' : '' }}
                    <span class="tooltiptext">Code: {{ dev.deviationId }}</span>
                  </span>
                </td>
                <!-- Tooltip: Related Entity displays Entity Name and relatedEntityId as tooltip -->
                <td>
                  <span class="tooltip">
                    {{ dev.relatedEntityType }}
                    <span class="tooltiptext">ID: {{ dev.relatedEntityId }}</span>
                  </span>
                </td>
                <td>{{ dev.detectionDate }}</td>
                <td>Staff ID: {{ dev.detectedById }}</td>
                <!-- Tooltip: Impact displays icon with severity tooltip -->
                <td>
                  <span class="tooltip font-large">
                    <span *ngIf="dev.impact === 'Minor'">🟢</span>
                    <span *ngIf="dev.impact === 'Major'">🟡</span>
                    <span *ngIf="dev.impact === 'Critical'">🔴</span>
                    <span class="tooltiptext">Impact: {{ dev.impact }}</span>
                  </span>
                </td>
                <td>
                  <span class="status-indicator" 
                    [class.status-open]="dev.status === 'Open'"
                    [class.status-investigating]="dev.status === 'Under Investigation'"
                    [class.status-capa]="dev.status === 'CAPA Created'"
                    [class.status-closed]="dev.status === 'Closed' || dev.status === 'CLS'">
                    {{ dev.status }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="viewDeviationDetails(dev)">View Details</button>
                </td>
              </tr>
              <tr *ngIf="deviations().length === 0">
                <td colspan="7" class="empty-state">No deviations logged.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="deviations().length > 0">
          <button [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
          <span>Page {{ page() }} of {{ totalPages() }}</span>
          <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next</button>
        </div>
      </div>

      <!-- Detail View: Inline tabs for Deviation Details & CAPAs -->
      <div class="detail-panel" *ngIf="selectedDeviation()">
        <div class="detail-header">
          <button class="btn btn-secondary" (click)="selectedDeviation.set(null)">← Back to Registry</button>
          
          <div class="header-title">
            <h3>Deviation: {{ selectedDeviation().deviationId }}</h3>
            <span class="status-indicator" 
              [class.status-open]="selectedDeviation().status === 'Open'"
              [class.status-investigating]="selectedDeviation().status === 'Under Investigation'"
              [class.status-capa]="selectedDeviation().status === 'CAPA Created'"
              [class.status-closed]="selectedDeviation().status === 'Closed' || selectedDeviation().status === 'CLS'">
              {{ selectedDeviation().status }}
            </span>
          </div>

          <!-- Workflow Controls -->
          <div class="workflow-controls" *ngIf="selectedDeviation().status !== 'Closed'">
            <button class="btn btn-primary" *ngIf="selectedDeviation().status === 'Open'" (click)="updateDeviationStatus('Under Investigation')">
              Start Investigation
            </button>
          </div>
        </div>

        <!-- Detail Tabs -->
        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'details'" (click)="detailTab.set('details')">Deviation Details</button>
          <button [class.active]="detailTab() === 'capa'" (click)="detailTab.set('capa')">CAPA Records</button>
          <button [class.active]="detailTab() === 'signatures'" (click)="detailTab.set('signatures')">Workflow Signatures</button>
        </div>

        <!-- Tab contents (No navigation away) -->
        <div class="tab-card">
          <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
          <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

          <!-- 1. DEVIATION DETAILS TAB -->
          <div *ngIf="detailTab() === 'details'" class="grid-details">
            <div class="detail-item"><span class="label">Deviation Code:</span> {{ selectedDeviation().deviationId }}</div>
            <div class="detail-item"><span class="label">Detection Date:</span> {{ selectedDeviation().detectionDate }}</div>
            <div class="detail-item"><span class="label">Assigned Entity Type:</span> {{ selectedDeviation().relatedEntityType }}</div>
            <div class="detail-item"><span class="label">Assigned Entity ID/Code:</span> {{ selectedDeviation().relatedEntityId }}</div>
            <div class="detail-item"><span class="label">Impact Severity:</span> {{ selectedDeviation().impact }}</div>
            <div class="detail-item"><span class="label">Logged By Staff ID:</span> {{ selectedDeviation().detectedById }}</div>
            <div class="detail-item" style="grid-column: span 2;">
              <span class="label">Detailed Deviation Reason:</span> 
              <p class="description-text">{{ selectedDeviation().description }}</p>
            </div>
          </div>

          <!-- 2. CAPAS TAB -->
          <div *ngIf="detailTab() === 'capa'">
            <div class="tab-action-bar">
              <h4>Corrective and Preventive Action Logs</h4>
              <button class="btn btn-secondary btn-sm" (click)="openCreateCapaModal()" [disabled]="selectedDeviation().status === 'Closed'">
                +Create CAPA
              </button>
            </div>

            <!-- List CAPA records associated with the deviation -->
            <div class="capa-records-list" style="margin-top: 16px;">
              <div class="capa-row-card" *ngFor="let capa of capas()">
                <div class="capa-card-header">
                  <h5>CAPA Code: {{ capa.capaId }}</h5>
                  <div class="capa-actions-area">
                    <span class="status-indicator" [class.status-active]="capa.status === 'Closed'" [class.status-inactive]="capa.status !== 'Closed'">
                      {{ capa.status }}
                    </span>
                    <button class="btn btn-secondary btn-sm" *ngIf="capa.status !== 'Closed'" (click)="openSignatureModal(capa)">
                      Sign & Close CAPA
                    </button>
                  </div>
                </div>

                <!-- CAPA tabs: Details, Actions, Evidence, History -->
                <div class="capa-tabs-nav">
                  <button [class.active]="capaTabs[capa.capaId] === 'details'" (click)="capaTabs[capa.capaId] = 'details'">Details</button>
                  <button [class.active]="capaTabs[capa.capaId] === 'actions'" (click)="capaTabs[capa.capaId] = 'actions'">Actions</button>
                  <button [class.active]="capaTabs[capa.capaId] === 'evidence'" (click)="capaTabs[capa.capaId] = 'evidence'">Evidence</button>
                </div>

                <div class="capa-tab-content">
                  <!-- Details -->
                  <div *ngIf="capaTabs[capa.capaId] === 'details'" class="grid-details">
                    <div class="detail-item"><span class="label">Assigned To Staff ID:</span> {{ capa.assignedToId }}</div>
                    <div class="detail-item"><span class="label">Target Due Date:</span> {{ capa.dueDate }}</div>
                    <div class="detail-item"><span class="label">Investigation Root Cause:</span> {{ capa.rootCause }}</div>
                    <div class="detail-item" *ngIf="capa.closedDate"><span class="label">Closed Date:</span> {{ capa.closedDate }}</div>
                  </div>

                  <!-- Actions -->
                  <div *ngIf="capaTabs[capa.capaId] === 'actions'" class="grid-details">
                    <div class="detail-item" style="grid-column: span 2;">
                      <span class="label">Corrective Action Plan (CAP):</span>
                      <p class="description-text">{{ capa.correctiveAction }}</p>
                    </div>
                    <div class="detail-item" style="grid-column: span 2;">
                      <span class="label">Preventive Action Plan (PAP):</span>
                      <p class="description-text">{{ capa.preventiveAction }}</p>
                    </div>
                  </div>

                  <!-- Evidence -->
                  <div *ngIf="capaTabs[capa.capaId] === 'evidence'">
                    <p style="font-size: 13.5px; color: #7a6a5e; margin: 0 0 10px;">Verification Evidence Manifest & Attachments</p>
                    <div class="evidence-block">
                      📄 Corrective verification trial audit log signed. Integrity checked intact.
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="capas().length === 0" class="empty-state" style="border: 1px solid #ece4dc; border-radius: 8px;">
                No CAPA procedures initialized for this deviation.
              </div>
            </div>
          </div>

          <!-- 3. SIGNATURES LOG TAB -->
          <div *ngIf="detailTab() === 'signatures'">
            <h4>Electronic Signature History Logs</h4>
            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Record ID</th>
                    <th>Signer</th>
                    <th>Meaning</th>
                    <th>Ver.</th>
                    <th>Signed At</th>
                    <th>SHA-256 Checksum Hash</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let s of signatureHistory()">
                    <td style="font-weight: 600;">{{ s.entityId }} ({{ s.entityType }})</td>
                    <td>{{ s.signerName }}</td>
                    <td><span class="role-pill">{{ s.meaning }}</span></td>
                    <td>v{{ s.entityVersion }}</td>
                    <td>{{ s.signedAt | date:'medium' }}</td>
                    <td style="font-family: monospace; font-size: 11px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" [title]="s.signatureHash">
                      {{ s.signatureHash }}
                    </td>
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

      <!-- ── MODALS ── -->

      <!-- 1. CREATE DEVIATION MODAL -->
      <div class="modal-overlay" *ngIf="showCreateDeviationModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create New Deviation Log</h3>
            <button class="close-modal" (click)="showCreateDeviationModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateDeviation()">
            <div class="field">
              <label>Deviation Code (Auto-Generated)</label>
              <input type="text" name="deviationId" [value]="createDeviationForm.deviationId" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Related Entity Type</label>
                <select name="relType" [(ngModel)]="createDeviationForm.relatedEntityType" required>
                  <option value="BatchRecord">Manufacturing Batch (BatchRecord)</option>
                  <option value="DrugShipment">Supply Shipment (DrugShipment)</option>
                  <option value="TrialProtocol">Clinical Study (TrialProtocol)</option>
                </select>
              </div>
              <div class="field">
                <label>Related Entity Identifier / Code</label>
                <input type="text" name="relId" [(ngModel)]="createDeviationForm.relatedEntityId" placeholder="e.g. BATCH-8012" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Impact Severity</label>
                <select name="impact" [(ngModel)]="createDeviationForm.impact" required>
                  <option value="Minor">Minor (Green)</option>
                  <option value="Major">Major (Yellow)</option>
                  <option value="Critical">Critical (Red)</option>
                </select>
              </div>
              <div class="field">
                <label>Detected By Staff ID</label>
                <input type="number" name="detBy" [(ngModel)]="createDeviationForm.detectedById" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Detection Date</label>
                <input type="date" name="detDate" [(ngModel)]="createDeviationForm.detectionDate" required>
              </div>
              <div class="field">
                <label>Status</label>
                <input type="text" name="status" value="Open" disabled style="background: #f7f5f2;">
              </div>
            </div>
            <div class="field">
              <label>Detailed Description of Discrepancy (Reason)</label>
              <input type="text" name="desc" [(ngModel)]="createDeviationForm.description" placeholder="Temperature excursion of +2°C noted during unloading." required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateDeviationModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Log Deviation</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. CREATE CAPA MODAL -->
      <div class="modal-overlay" *ngIf="showCreateCapaModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create CAPA Corrective Plan</h3>
            <button class="close-modal" (click)="showCreateCapaModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateCapa()">
            <div class="field">
              <label>CAPA Identifier (Auto-Generated)</label>
              <input type="text" name="capaId" [value]="createCapaForm.capaId" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Assigned Staff ID</label>
                <input type="number" name="capaAss" [(ngModel)]="createCapaForm.assignedToId" required>
              </div>
              <div class="field">
                <label>Target Due Date</label>
                <input type="date" name="capaDue" [(ngModel)]="createCapaForm.dueDate" required>
              </div>
            </div>
            <div class="field">
              <label>Investigation Root Cause Analysis</label>
              <input type="text" name="capaRoot" [(ngModel)]="createCapaForm.rootCause" placeholder="Faulty temperature sensor battery calibration." required>
            </div>
            <div class="field">
              <label>Corrective Action Plan (CAP)</label>
              <input type="text" name="capaCorr" [(ngModel)]="createCapaForm.correctiveAction" placeholder="Replaced battery and re-calibrated sensors immediately." required>
            </div>
            <div class="field">
              <label>Preventive Action Plan (PAP)</label>
              <input type="text" name="capaPrev" [(ngModel)]="createCapaForm.preventiveAction" placeholder="Scheduled bi-monthly battery integrity verification pass." required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateCapaModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Initialize CAPA</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 3. ELECTRONIC SIGNATURE DIALOG FOR CAPA CLOSING -->
      <div class="modal-overlay" *ngIf="showSignatureModal()">
        <div class="modal-card" style="max-width: 420px;">
          <div class="modal-header">
            <h3>Electronic Signature Verification</h3>
            <button class="close-modal" (click)="showSignatureModal.set(false)">×</button>
          </div>
          <div class="details-pane" style="font-size: 13.5px; margin-bottom: 8px;">
            <p>You are applying a legally binding electronic signature to verify and CLOSE this CAPA record.</p>
            <div class="detail-item"><span class="label">CAPA ID:</span> {{ selectedCapaForSign()?.capaId }}</div>
            <div class="detail-item"><span class="label">Meaning:</span> APPROVED</div>
          </div>
          <form (ngSubmit)="executeSignatureTransition()">
            <div class="field">
              <label>Verify Identity Password</label>
              <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showSignatureModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="signing()">
                {{ signing() ? 'Signing...' : 'Verify & Close' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .deviations-container {
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
    .status-open {
      background: #fff8e1;
      color: #f57f17;
      border-color: #ffe082;
    }
    .status-investigating {
      background: #e8f1fa;
      color: #1d5f9e;
      border-color: #bbdefb;
    }
    .status-capa {
      background: #fff3e0;
      color: #e65100;
      border-color: #ffcc80;
    }
    .status-closed {
      background: #e8f5e9;
      color: #2e7d32;
      border-color: #c8e6c9;
    }
    .font-large {
      font-size: 18px;
    }
    /* GORGEOUS CUSTOM TOOLTIP (Black background, white text, rounded corners) */
    .tooltip {
      position: relative;
      display: inline-block;
      cursor: pointer;
    }
    .tooltip .tooltiptext {
      visibility: hidden;
      width: 160px;
      background-color: #000000;
      color: #ffffff;
      text-align: center;
      border-radius: 6px;
      padding: 6px 10px;
      position: absolute;
      z-index: 100;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      font-size: 11px;
      font-weight: 500;
      pointer-events: none;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .tooltip:hover .tooltiptext {
      visibility: visible;
      opacity: 1;
    }
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
    .description-text {
      background: #f7f5f2;
      border: 1px solid #ece4dc;
      padding: 12px;
      border-radius: 6px;
      font-size: 14px;
      margin-top: 6px;
    }
    .tab-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ece4dc;
      padding-bottom: 10px;
      margin-bottom: 16px;
    }
    .tab-action-bar h4 {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: 16px;
      font-weight: 800;
    }
    .capa-records-list {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .capa-row-card {
      border: 1px solid #ece4dc;
      border-radius: 10px;
      padding: 20px;
      background: #ffffff;
      box-shadow: 0 4px 12px rgba(86, 34, 0, 0.02);
    }
    .capa-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ece4dc;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .capa-card-header h5 {
      margin: 0;
      font-family: 'Manrope', sans-serif;
      font-size: 15px;
      font-weight: 800;
      color: #562200;
    }
    .capa-actions-area {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .capa-tabs-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    .capa-tabs-nav button {
      background: none;
      border: none;
      padding: 6px 12px;
      font-size: 12.5px;
      font-weight: 600;
      color: #7a6a5e;
      cursor: pointer;
      border-radius: 4px;
    }
    .capa-tabs-nav button.active {
      background: #fbe9de;
      color: #CE5200;
    }
    .capa-tab-content {
      padding: 10px 0 0;
    }
    .evidence-block {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
      padding: 12px;
      border-radius: 6px;
      font-size: 13.5px;
      font-weight: 500;
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
    .role-pill {
      background: #fbe9de;
      color: #CE5200;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
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
}
