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
    <div class="trials-container">
      <!-- Master View: Trials List -->
      <div class="master-panel" *ngIf="!selectedTrial()">
        <div class="panel-header">
          <div>
            <h2>Clinical Trials Protocol Registry</h2>
            <p>Establish and monitor clinical study protocols across site networks.</p>
          </div>
          <div>
            <button class="btn btn-primary" (click)="openCreateTrialModal()">+Create Trial</button>
          </div>
        </div>

        <!-- Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Trial Code</th>
                <th>Product</th>
                <th>Indication</th>
                <th>Phase</th>
                <th>Planned Subjects</th>
                <th>Start Date</th>
                <th>Status</th>
                <th style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let trial of paginatedTrials()">
                <td style="font-weight: 700; color: #CE5200;">{{ trial.trialCode }}</td>
                <td>{{ getProductName(trial.productId) }}</td>
                <td>{{ trial.indication }}</td>
                <td><span class="phase-pill">{{ trial.phase }}</span></td>
                <td>{{ trial.plannedSubjects }}</td>
                <td>{{ trial.startDate }}</td>
                <td>
                  <span class="status-indicator" 
                    [class.status-draft]="trial.status === 'Draft'"
                    [class.status-active]="trial.status === 'Active' || trial.status === 'Approved'"
                    [class.status-suspended]="trial.status === 'Suspended'"
                    [class.status-completed]="trial.status === 'Completed'"
                    [class.status-terminated]="trial.status === 'Terminated'">
                    {{ trial.status }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="viewTrialDetails(trial)">View</button>
                </td>
              </tr>
              <tr *ngIf="trials().length === 0">
                <td colspan="8" class="empty-state">No clinical trials registered.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="trials().length > 0">
          <button [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
          <span>Page {{ page() }} of {{ totalPages() }}</span>
          <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next</button>
        </div>
      </div>

      <!-- Detail View: Side-by-Side Tabs on the same page -->
      <div class="detail-panel" *ngIf="selectedTrial()">
        <div class="detail-header">
          <button class="btn btn-secondary" (click)="selectedTrial.set(null)">← Back to Registry</button>
          
          <div class="header-title">
            <h3>Trial Protocol: {{ selectedTrial().trialCode }}</h3>
            <span class="status-indicator" 
              [class.status-draft]="selectedTrial().status === 'Draft'"
              [class.status-active]="selectedTrial().status === 'Active' || selectedTrial().status === 'Approved'"
              [class.status-suspended]="selectedTrial().status === 'Suspended'"
              [class.status-completed]="selectedTrial().status === 'Completed'"
              [class.status-terminated]="selectedTrial().status === 'Terminated'">
              {{ selectedTrial().status }}
            </span>
          </div>

          <!-- Workflow Controls -->
          <div class="workflow-controls">
            <!-- Draft Status: show Send only -->
            <button class="btn btn-primary" *ngIf="selectedTrial().status === 'Draft'" (click)="openSignatureModal('Approved')">
              Send for Approval
            </button>

            <!-- Active Status: show Filter dropdown with Suspended, Completed, Terminated -->
            <div class="workflow-dropdown-group" *ngIf="selectedTrial().status === 'Active' || selectedTrial().status === 'Approved'">
              <label>Transition Status:</label>
              <select (change)="onStatusChangeSelect($event)">
                <option value="">-- Choose Status --</option>
                <option value="Suspended">Suspended</option>
                <option value="Completed">Completed</option>
                <option value="Terminated">Terminated</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Inline Tabs -->
        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'protocol'" (click)="detailTab.set('protocol')">Study Protocol</button>
          <button [class.active]="detailTab() === 'sites'" (click)="detailTab.set('sites')">Mapped Investigation Sites</button>
          <button [class.active]="detailTab() === 'history'" (click)="detailTab.set('history')">Workflow Log</button>
        </div>

        <!-- Tab Contents (No navigation away) -->
        <div class="tab-card">
          <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
          <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

          <!-- Protocol Details Tab -->
          <div *ngIf="detailTab() === 'protocol'" class="grid-details">
            <div class="detail-item"><span class="label">Product under Test:</span> {{ getProductName(selectedTrial().productId) }}</div>
            <div class="detail-item"><span class="label">Primary Indication:</span> {{ selectedTrial().indication }}</div>
            <div class="detail-item"><span class="label">Phase:</span> {{ selectedTrial().phase }}</div>
            <div class="detail-item"><span class="label">Planned Sample Size:</span> {{ selectedTrial().plannedSubjects }} subjects</div>
            <div class="detail-item"><span class="label">Proposed Start Date:</span> {{ selectedTrial().startDate }}</div>
            <div class="detail-item"><span class="label">Proposed End Date:</span> {{ selectedTrial().endDate }}</div>
            <div class="detail-item"><span class="label">Principal Investigator ID:</span> User ID {{ selectedTrial().principalInvestigatorId }}</div>
          </div>

          <!-- Mapped Sites Tab -->
          <div *ngIf="detailTab() === 'sites'">
            <div class="tab-action-bar">
              <h4>Associated Investigation Sites</h4>
              <button class="btn btn-secondary btn-sm" (click)="openAddSiteModal()">+Map Site</button>
            </div>
            
            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
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
                    <td style="font-weight: 600;">{{ getSiteName(ts.siteId) }}</td>
                    <td>{{ getSiteCountry(ts.siteId) }}</td>
                    <td>{{ ts.plannedSubjects }}</td>
                    <td>Investigator ID: {{ ts.principalInvestigatorId }}</td>
                    <td>
                      <span class="status-indicator" [class.status-active]="ts.status === 'ACTIVE'" [class.status-inactive]="ts.status !== 'ACTIVE'">
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

          <!-- Workflow History Tab -->
          <div *ngIf="detailTab() === 'history'">
            <h4>Electronic Signature Verification Logs</h4>
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
                    <td colspan="5" class="empty-state">No electronic signatures applied to this record yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODALS ── -->

      <!-- 1. CREATE TRIAL MODAL -->
      <div class="modal-overlay" *ngIf="showCreateTrialModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create Clinical Study Protocol</h3>
            <button class="close-modal" (click)="showCreateTrialModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateTrial()">
            <!-- Auto-generated Trial Code displays info -->
            <div class="field">
              <label>Trial Code (Auto-Generated)</label>
              <input type="text" name="trialCode" [value]="createTrialForm.trialCode" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Target Product</label>
                <select name="productId" [(ngModel)]="createTrialForm.productId" required>
                  <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Study Phase</label>
                <select name="phase" [(ngModel)]="createTrialForm.phase" required>
                  <option value="PHASE_I">Phase I</option>
                  <option value="PHASE_II">Phase II</option>
                  <option value="PHASE_III">Phase III</option>
                  <option value="PHASE_IV">Phase IV</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Indication / Condition</label>
              <input type="text" name="indication" [(ngModel)]="createTrialForm.indication" placeholder="e.g. Type II Diabetes Mellitus" required>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Planned Subjects Count</label>
                <input type="number" name="planned" [(ngModel)]="createTrialForm.plannedSubjects" required>
              </div>
              <div class="field">
                <label>Principal Investigator ID</label>
                <input type="number" name="piId" [(ngModel)]="createTrialForm.principalInvestigatorId" placeholder="Investigator Staff ID" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Start Date</label>
                <input type="date" name="startDate" [(ngModel)]="createTrialForm.startDate" required>
              </div>
              <div class="field">
                <label>End Date</label>
                <input type="date" name="endDate" [(ngModel)]="createTrialForm.endDate" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateTrialModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Protocol</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. MAP SITE MODAL -->
      <div class="modal-overlay" *ngIf="showAddSiteModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Map Site to Study Protocol</h3>
            <button class="close-modal" (click)="showAddSiteModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleMapSite()">
            <div class="field">
              <label>Select Site Directory</label>
              <select name="siteId" [(ngModel)]="addSiteForm.siteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }} ({{ s.country }})</option>
              </select>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Planned Subject Cohort</label>
                <input type="number" name="cohort" [(ngModel)]="addSiteForm.plannedSubjects" required>
              </div>
              <div class="field">
                <label>Principal Investigator ID</label>
                <input type="number" name="sitePi" [(ngModel)]="addSiteForm.principalInvestigatorId" placeholder="PI User ID" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showAddSiteModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Associate Site</button>
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
            <p>You are applying a legally binding electronic signature to transition this study record.</p>
            <div class="detail-item"><span class="label">Action:</span> Transition to <strong>{{ targetStatus() }}</strong></div>
            <div class="detail-item"><span class="label">Reasoning:</span> APPROVED</div>
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
                {{ signing() ? 'Signing...' : 'Verify & Commit' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .trials-container {
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
    .phase-pill {
      background: #e8f1fa;
      color: #1d5f9e;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
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
    .status-active {
      background: #e8f5e9;
      color: #2e7d32;
      border-color: #c8e6c9;
    }
    .status-suspended {
      background: #fff8e1;
      color: #f57f17;
      border-color: #ffe082;
    }
    .status-completed {
      background: #e8f1fa;
      color: #1d5f9e;
      border-color: #bbdefb;
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
}
