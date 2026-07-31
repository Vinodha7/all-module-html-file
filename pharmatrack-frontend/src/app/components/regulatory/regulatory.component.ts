import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-regulatory-affairs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="regulatory-container">
      <!-- Master View: Dossiers list -->
      <div class="master-panel" *ngIf="!selectedDossier()">
        <div class="panel-header">
          <div>
            <h2>Regulatory Dossiers Registry</h2>
            <p>Compile drug dossier submissions, schedule milestones, and transition approval workflow states.</p>
          </div>
          <div>
            <button class="btn btn-primary" (click)="openCreateDossierModal()">+Create Dossier</button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Dossier Code</th>
                <th>Target Product</th>
                <th>Submission Type</th>
                <th>Target Market</th>
                <th>Assigned Officer</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let dos of paginatedDossiers()">
                <td style="font-weight: 700; color: #CE5200;">{{ dos.dossierId }}</td>
                <td>{{ getProductName(dos.productId) }}</td>
                <td><span class="role-pill">{{ dos.submissionType }}</span></td>
                <td>{{ dos.targetMarket }}</td>
                <td>Officer ID: {{ dos.assignedOfficerId }}</td>
                <td>{{ dos.submissionDate }}</td>
                <td>
                  <span class="status-indicator" 
                    [class.status-draft]="dos.status === 'Draft'"
                    [class.status-submitted]="dos.status === 'Submitted'"
                    [class.status-review]="dos.status === 'Under Review' || dos.status === 'UnderReview'"
                    [class.status-active]="dos.status === 'Approved'"
                    [class.status-terminated]="dos.status === 'Rejected' || dos.status === 'Withdrawn'">
                    {{ dos.status }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="viewDossierDetails(dos)">View</button>
                </td>
              </tr>
              <tr *ngIf="dossiers().length === 0">
                <td colspan="8" class="empty-state">No regulatory dossiers compiled.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="dossiers().length > 0">
          <button [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
          <span>Page {{ page() }} of {{ totalPages() }}</span>
          <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next</button>
        </div>
      </div>

      <!-- Detail View: Side-by-Side tabs on the same page -->
      <div class="detail-panel" *ngIf="selectedDossier()">
        <div class="detail-header">
          <button class="btn btn-secondary" (click)="selectedDossier.set(null)">← Back to Registry</button>
          
          <div class="header-title">
            <h3>Dossier Protocol: {{ selectedDossier().dossierId }}</h3>
            <span class="status-indicator" 
              [class.status-draft]="selectedDossier().status === 'Draft'"
              [class.status-submitted]="selectedDossier().status === 'Submitted'"
              [class.status-review]="selectedDossier().status === 'Under Review' || selectedDossier().status === 'UnderReview'"
              [class.status-active]="selectedDossier().status === 'Approved'"
              [class.status-terminated]="selectedDossier().status === 'Rejected' || selectedDossier().status === 'Withdrawn'">
              {{ selectedDossier().status }}
            </span>
          </div>

          <!-- Workflow Controls -->
          <div class="workflow-controls">
            <!-- Draft: transition to Submitted -->
            <button class="btn btn-primary" *ngIf="selectedDossier().status === 'Draft'" (click)="transitionStateDirect('Submitted')">
              Submit Dossier
            </button>

            <!-- Submitted: transition to Under Review or Withdrawn -->
            <div class="workflow-dropdown-group" *ngIf="selectedDossier().status === 'Submitted'">
              <label>Transition State:</label>
              <select (change)="onStatusChangeSelect($event)">
                <option value="">-- Choose Status --</option>
                <option value="UnderReview">Under Review</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            <!-- UnderReview: Gated Approved (Signature-Gated) or Rejected -->
            <div class="workflow-dropdown-group" *ngIf="selectedDossier().status === 'UnderReview' || selectedDossier().status === 'Under Review'">
              <label>Officer Audit Verdict:</label>
              <select (change)="onStatusChangeSelect($event)">
                <option value="">-- Choose Verdict --</option>
                <option value="Approved">Approved (Signature-Gated)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Inline Tabs -->
        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'dossier'" (click)="detailTab.set('dossier')">Dossier Details</button>
          <button [class.active]="detailTab() === 'milestones'" (click)="detailTab.set('milestones')">Milestones Log</button>
          <button [class.active]="detailTab() === 'history'" (click)="detailTab.set('history')">Submission History</button>
        </div>

        <!-- Tab contents (No navigation away) -->
        <div class="tab-card">
          <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
          <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

          <!-- Dossier Details Tab -->
          <div *ngIf="detailTab() === 'dossier'" class="grid-details">
            <div class="detail-item"><span class="label">Dossier Code:</span> {{ selectedDossier().dossierId }}</div>
            <div class="detail-item"><span class="label">Product Name:</span> {{ getProductName(selectedDossier().productId) }}</div>
            <div class="detail-item"><span class="label">Submission Type:</span> {{ selectedDossier().submissionType }}</div>
            <div class="detail-item"><span class="label">Target Market Region:</span> {{ selectedDossier().targetMarket }}</div>
            <div class="detail-item"><span class="label">Submission Date:</span> {{ selectedDossier().submissionDate }}</div>
            <div class="detail-item"><span class="label">Assigned Regulatory Officer:</span> Officer ID: {{ selectedDossier().assignedOfficerId }}</div>
          </div>

          <!-- Milestones Tab -->
          <div *ngIf="detailTab() === 'milestones'">
            <div class="tab-action-bar">
              <h4>Milestones Timeline</h4>
              <button class="btn btn-secondary btn-sm" (click)="openCreateMilestoneModal()" [disabled]="selectedDossier().status === 'Approved' || selectedDossier().status === 'Rejected'">
                +Create Milestone
              </button>
            </div>

            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Milestone ID</th>
                    <th>Type</th>
                    <th>Date Scheduled</th>
                    <th>Milestone Notes</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of milestones()">
                    <td style="font-weight: 600;">{{ m.milestoneId }}</td>
                    <td style="font-weight: 600;">{{ m.milestoneType }}</td>
                    <td>{{ m.milestoneDate }}</td>
                    <td>{{ m.notes }}</td>
                    <td>
                      <span class="status-indicator" [class.status-active]="m.status === 'Completed'" [class.status-draft]="m.status !== 'Completed'">
                        {{ m.status }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="milestones().length === 0">
                    <td colspan="5" class="empty-state">No milestones scheduled for this dossier profile yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Submission History Tab -->
          <div *ngIf="detailTab() === 'history'">
            <h4>Electronic Signature Audit Trail</h4>
            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Signer Name</th>
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
                    <td colspan="5" class="empty-state">No electronic signatures registered for this dossier.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODALS ── -->

      <!-- 1. CREATE DOSSIER MODAL -->
      <div class="modal-overlay" *ngIf="showCreateDossierModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create Drug Regulatory Dossier</h3>
            <button class="close-modal" (click)="showCreateDossierModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateDossier()">
            <div class="field">
              <label>Dossier Code (Auto-Generated)</label>
              <input type="text" name="dosId" [value]="createDossierForm.dossierId" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Target Product</label>
                <select name="productId" [(ngModel)]="createDossierForm.productId" required>
                  <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Submission Type</label>
                <select name="subType" [(ngModel)]="createDossierForm.submissionType" required>
                  <option value="NDA">NDA (New Drug Application)</option>
                  <option value="ANDA">ANDA (Abbreviated NDA)</option>
                  <option value="BLA">BLA (Biologics License App)</option>
                  <option value="IND">IND (Investigational NDA)</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Target Market Region</label>
                <input type="text" name="market" [(ngModel)]="createDossierForm.targetMarket" placeholder="e.g. FDA (United States)" required>
              </div>
              <div class="field">
                <label>Assigned Regulatory Officer ID</label>
                <input type="text" name="officer" [(ngModel)]="createDossierForm.assignedOfficerId" required>
              </div>
            </div>
            <div class="field">
              <label>Submission Date</label>
              <input type="date" name="subDate" [(ngModel)]="createDossierForm.submissionDate" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateDossierModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Dossier</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. CREATE MILESTONE MODAL -->
      <div class="modal-overlay" *ngIf="showCreateMilestoneModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create Regulatory Milestone</h3>
            <button class="close-modal" (click)="showCreateMilestoneModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateMilestone()">
            <div class="field">
              <label>Milestone Code (Auto-Generated)</label>
              <input type="text" name="msId" [value]="createMilestoneForm.milestoneId" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Milestone Type</label>
                <input type="text" name="msType" [(ngModel)]="createMilestoneForm.milestoneType" placeholder="e.g. FDA Panel Review" required>
              </div>
              <div class="field">
                <label>Date Scheduled</label>
                <input type="date" name="msDate" [(ngModel)]="createMilestoneForm.milestoneDate" required>
              </div>
            </div>
            <div class="field">
              <label>Milestone Status</label>
              <select name="msStatus" [(ngModel)]="createMilestoneForm.status" required>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>
            <div class="field">
              <label>Additional Notes / Directives</label>
              <input type="text" name="msNotes" [(ngModel)]="createMilestoneForm.notes" placeholder="Panel session scheduled at 10 AM EST." required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateMilestoneModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Milestone</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 3. ELECTRONIC SIGNATURE DIALOG -->
      <div class="modal-overlay" *ngIf="showSignatureModal()">
        <div class="modal-card" style="max-width: 420px;">
          <div class="modal-header">
            <h3>Electronic Signature Verification</h3>
            <button class="close-modal" (click)="showSignatureModal.set(false)">×</button>
          </div>
          <div class="details-pane" style="font-size: 13.5px; margin-bottom: 8px;">
            <p>You are applying a legally binding electronic signature to APPROVE this drug regulatory dossier submission.</p>
            <div class="detail-item"><span class="label">Action:</span> Transition to <strong>Approved</strong></div>
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
                {{ signing() ? 'Signing...' : 'Verify & Approve' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .regulatory-container {
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
    .status-draft {
      background: #f7f5f2;
      color: #7a6a5e;
      border-color: #ece4dc;
    }
    .status-submitted {
      background: #e8f1fa;
      color: #1d5f9e;
      border-color: #bbdefb;
    }
    .status-review {
      background: #fff8e1;
      color: #f57f17;
      border-color: #ffe082;
    }
    .status-active {
      background: #e8f5e9;
      color: #2e7d32;
      border-color: #c8e6c9;
    }
    .status-terminated {
      background: #fbeceb;
      color: #b3261e;
      border-color: #ffcdd2;
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
    .workflow-dropdown-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .workflow-dropdown-group label {
      font-size: 13.5px;
      font-weight: 700;
      color: #211611;
    }
    .workflow-dropdown-group select {
      padding: 8px 12px;
      border: 1px solid #ece4dc;
      border-radius: 6px;
      outline: none;
      font-size: 13.5px;
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
    .role-pill {
      background: #fbe9de;
      color: #CE5200;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  `]
})
export class RegulatoryComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  dossiers = signal<any[]>([]);
  products = signal<any[]>([]);

  // Selection
  selectedDossier = signal<any | null>(null);
  detailTab = signal<'dossier' | 'milestones' | 'history'>('dossier');

  // Sub-logs
  milestones = signal<any[]>([]);
  signatureHistory = signal<any[]>([]);

  // Pagination
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  // Modals Visibility
  showCreateDossierModal = signal<boolean>(false);
  showCreateMilestoneModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // Form Models
  createDossierForm = {
    dossierId: '',
    productId: null as any,
    submissionType: 'NDA',
    targetMarket: '',
    submissionDate: '',
    assignedOfficerId: '1',
    status: 'Draft'
  };

  createMilestoneForm = {
    milestoneId: '',
    milestoneType: '',
    milestoneDate: '',
    notes: '',
    status: 'Scheduled'
  };

  // Electronic Signature
  signaturePassword = '';
  targetStatus = signal<string>('');
  signing = signal<boolean>(false);

  ngOnInit() {
    this.fetchProducts();
    this.fetchDossiers();
  }

  fetchDossiers() {
    this.apiService.getDossiers().subscribe({
      next: (data) => {
        this.dossiers.set(data || []);
        this.totalPages.set(Math.ceil(data.length / this.pageSize) || 1);
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching regulatory dossiers registry.')
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

  paginatedDossiers() {
    const start = (this.page() - 1) * this.pageSize;
    return this.dossiers().slice(start, start + this.pageSize);
  }

  getProductName(productId: any): string {
    const p = this.products().find(item => String(item.productId) === String(productId));
    return p ? p.productName : `Prod ID: ${productId}`;
  }

  viewDossierDetails(dos: any) {
    this.selectedDossier.set(dos);
    this.detailTab.set('dossier');
    this.clearMessages();
    this.fetchMilestones(dos.dossierId);
    this.fetchSignatureHistory(dos.dossierId);
  }

  fetchMilestones(dossierId: string) {
    this.apiService.getMilestonesByDossier(dossierId).subscribe({
      next: (data) => this.milestones.set(data || []),
      error: () => this.milestones.set([])
    });
  }

  fetchSignatureHistory(dossierId: string) {
    this.apiService.getSignatures('RegulatoryDossier', dossierId).subscribe({
      next: (res) => {
        if (res.success) {
          this.signatureHistory.set(res.data || []);
        }
      },
      error: () => this.signatureHistory.set([])
    });
  }

  openCreateDossierModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.createDossierForm = {
      dossierId: `DOS-${rand}`,
      productId: this.products()[0]?.productId || null,
      submissionType: 'NDA',
      targetMarket: 'EMA (European Union)',
      submissionDate: new Date().toISOString().substring(0, 10),
      assignedOfficerId: '1',
      status: 'Draft'
    };
    this.showCreateDossierModal.set(true);
    this.clearMessages();
  }

  handleCreateDossier() {
    this.apiService.createDossier(this.createDossierForm).subscribe({
      next: () => {
        this.showSuccess('Regulatory dossier compiled successfully in Draft state.');
        this.showCreateDossierModal.set(false);
        this.fetchDossiers();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to initialize regulatory dossier.')
    });
  }

  transitionStateDirect(target: string) {
    this.clearMessages();
    const payload = {
      ...this.selectedDossier(),
      status: target
    };

    this.apiService.updateDossier(payload).subscribe({
      next: () => {
        this.showSuccess(`Dossier transitioned to state: ${target}`);
        
        // Reload details
        const updatedDos = { ...this.selectedDossier(), status: target };
        this.selectedDossier.set(updatedDos);
        this.fetchDossiers();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to transition dossier state.')
    });
  }

  openCreateMilestoneModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.createMilestoneForm = {
      milestoneId: `MS-${rand}`,
      milestoneType: 'Dossier Validation Pass',
      milestoneDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      notes: 'Initial validation check pass by regulatory officer.',
      status: 'Scheduled'
    };
    this.showCreateMilestoneModal.set(true);
    this.clearMessages();
  }

  handleCreateMilestone() {
    const payload = {
      ...this.createMilestoneForm,
      dossierId: this.selectedDossier().dossierId
    };

    this.apiService.createMilestone(payload).subscribe({
      next: () => {
        this.showSuccess('Regulatory milestone timeline scheduled.');
        this.showCreateMilestoneModal.set(false);
        this.fetchMilestones(payload.dossierId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to schedule milestone.')
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
    if (val === 'Approved') {
      this.openSignatureModal('Approved');
    } else if (val) {
      this.transitionStateDirect(val);
    }
    e.target.value = '';
  }

  executeSignatureTransition() {
    this.signing.set(true);
    this.clearMessages();

    // Create approving signature:
    // POST /pharmaTrack/identityAccess/signatures
    const signaturePayload = {
      entityType: 'RegulatoryDossier',
      entityId: this.selectedDossier().dossierId,
      entityVersion: '1',
      meaning: 'APPROVED'
    };

    this.apiService.signEntity(signaturePayload).subscribe({
      next: (res) => {
        if (res.success) {
          // Transition:
          // POST /pharmaTrack/regulatoryAffairs/workflow/transition
          const transitionPayload = {
            entityType: 'RegulatoryDossier',
            entityId: this.selectedDossier().dossierId,
            targetStatus: 'Approved',
            reason: `Dossier approved by regulatory officer. Signature ID ${res.data?.signatureId}`
          };

          this.apiService.transitionWorkflow('regulatoryAffairs', transitionPayload).subscribe({
            next: () => {
              this.signing.set(false);
              this.showSignatureModal.set(false);
              this.showSuccess('Regulatory dossier signed and Approved successfully.');

              // Reload details
              const updatedDos = { ...this.selectedDossier(), status: 'Approved' };
              this.selectedDossier.set(updatedDos);
              this.fetchDossiers();
              this.fetchSignatureHistory(updatedDos.dossierId);
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
