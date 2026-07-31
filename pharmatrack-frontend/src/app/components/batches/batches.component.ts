import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="batches-container">
      <!-- Master View: Batches list -->
      <div class="master-panel" *ngIf="!selectedBatch()">
        <div class="panel-header">
          <div>
            <h2>Batch Manufacturing Register</h2>
            <p>Track production progress, record raw material lots, and manage quality release protocols.</p>
          </div>
          <div>
            <button class="btn btn-primary" (click)="openCreateBatchModal()">+Create Batch</button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Target Product</th>
                <th>Quantity Manufactured</th>
                <th>Mfg Date</th>
                <th>Exp Date</th>
                <th>Manufacturing Site</th>
                <th>Status</th>
                <th style="width: 100px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let batch of paginatedBatches()">
                <td style="font-weight: 700; color: #CE5200;">{{ batch.batchNumber }}</td>
                <td>{{ getProductName(batch.productId) }}</td>
                <td>{{ batch.quantityManufactured }} {{ batch.unit }}</td>
                <td>{{ batch.manufacturingDate }}</td>
                <td>{{ batch.expiryDate }}</td>
                <td>{{ getSiteName(batch.manufacturingSiteId) }}</td>
                <td>
                  <span class="status-indicator" 
                    [class.status-ip]="batch.status === 'InProgress'"
                    [class.status-qch]="batch.status === 'QCHold' || batch.status === 'QCH'"
                    [class.status-rel]="batch.status === 'Released' || batch.status === 'REL'"
                    [class.status-recalled]="batch.status === 'Recalled'"
                    [class.status-rejected]="batch.status === 'Rejected'">
                    {{ batch.status }}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" (click)="viewBatchDetails(batch)">View</button>
                </td>
              </tr>
              <tr *ngIf="batches().length === 0">
                <td colspan="8" class="empty-state">No batch runs recorded.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="batches().length > 0">
          <button [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
          <span>Page {{ page() }} of {{ totalPages() }}</span>
          <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next</button>
        </div>
      </div>

      <!-- Detail View: Side-by-Side tabs on the same page -->
      <div class="detail-panel" *ngIf="selectedBatch()">
        <div class="detail-header">
          <button class="btn btn-secondary" (click)="selectedBatch.set(null)">← Back to Register</button>
          
          <div class="header-title">
            <h3>Batch Run: {{ selectedBatch().batchNumber }}</h3>
            <span class="status-indicator" 
              [class.status-ip]="selectedBatch().status === 'InProgress'"
              [class.status-qch]="selectedBatch().status === 'QCHold' || selectedBatch().status === 'QCH'"
              [class.status-rel]="selectedBatch().status === 'Released' || selectedBatch().status === 'REL'"
              [class.status-recalled]="selectedBatch().status === 'Recalled'"
              [class.status-rejected]="selectedBatch().status === 'Rejected'">
              {{ selectedBatch().status }}
            </span>
          </div>

          <!-- Workflow Controls -->
          <div class="workflow-controls">
            <!-- InProgress: Send button transitions to QCHold (Non-signature transition) -->
            <button class="btn btn-primary" *ngIf="selectedBatch().status === 'InProgress'" (click)="transitionStateDirect('QCHold')">
              Send to QC Hold
            </button>

            <!-- QCHold: Show filter dropdown with Released, Recalled, Rejected -->
            <div class="workflow-dropdown-group" *ngIf="selectedBatch().status === 'QCHold' || selectedBatch().status === 'QCH'">
              <label>QC Review Action:</label>
              <select (change)="onStatusChangeSelect($event)">
                <option value="">-- Choose Status --</option>
                <option value="Released">Released (Signature-Gated)</option>
                <option value="Recalled">Recalled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Detail Tabs -->
        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'qc'" (click)="detailTab.set('qc')">QC Tests</button>
          <button [class.active]="detailTab() === 'materials'" (click)="detailTab.set('materials')">Raw Materials</button>
          <button [class.active]="detailTab() === 'signatures'" (click)="detailTab.set('signatures')">Workflow Signatures</button>
        </div>

        <!-- Tab contents (No navigation away) -->
        <div class="tab-card">
          <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
          <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

          <!-- 1. QC TESTS TAB -->
          <div *ngIf="detailTab() === 'qc'">
            <div class="tab-action-bar">
              <h4>QC Inspection Protocols</h4>
              <button class="btn btn-secondary btn-sm" (click)="openAddQcModal()" [disabled]="selectedBatch().status === 'Released' || selectedBatch().status === 'REL'">
                +Record QC Test
              </button>
            </div>

            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Test ID</th>
                    <th>Test Type</th>
                    <th>Date Tested</th>
                    <th>Specifications Range</th>
                    <th>Result Value</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of qcTests()">
                    <td style="font-weight: 600;">{{ t.testId }}</td>
                    <td>{{ t.testType }}</td>
                    <td>{{ t.testDate }}</td>
                    <td>{{ t.specification }}</td>
                    <td>{{ t.result }}</td>
                    <td>
                      <span class="status-indicator" [class.status-active]="t.status === 'PASS'" [class.status-inactive]="t.status !== 'PASS'">
                        {{ t.status }}
                      </span>
                    </td>
                  </tr>
                  <tr *ngIf="qcTests().length === 0">
                    <td colspan="6" class="empty-state">No QC tests recorded for this batch yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 2. RAW MATERIALS TAB -->
          <div *ngIf="detailTab() === 'materials'">
            <div class="tab-action-bar">
              <h4>Raw Material Lot Dispensing Log</h4>
              <button class="btn btn-secondary btn-sm" (click)="openAddMaterialModal()" [disabled]="selectedBatch().status === 'Released' || selectedBatch().status === 'REL'">
                +Record Material Usage
              </button>
            </div>

            <div class="table-container" style="margin-top: 12px;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Usage ID</th>
                    <th>Material Name</th>
                    <th>Lot Number</th>
                    <th>Quantity Dispensed</th>
                    <th>Log Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of rawMaterials()">
                    <td style="font-weight: 600;">{{ m.usageId }}</td>
                    <td style="font-weight: 600;">{{ m.materialName }}</td>
                    <td>{{ m.materialLotNumber }}</td>
                    <td>{{ m.quantityUsed }} {{ m.unit }}</td>
                    <td><span class="role-pill">{{ m.status }}</span></td>
                  </tr>
                  <tr *ngIf="rawMaterials().length === 0">
                    <td colspan="5" class="empty-state">No raw materials registered for this batch run.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 3. SIGNATURES TAB -->
          <div *ngIf="detailTab() === 'signatures'">
            <h4>Electronic Signature Release Logs</h4>
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
                    <td colspan="5" class="empty-state">No electronic signatures applied to this batch.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODALS ── -->

      <!-- 1. CREATE BATCH MODAL -->
      <div class="modal-overlay" *ngIf="showCreateBatchModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create Manufacturing Batch</h3>
            <button class="close-modal" (click)="showCreateBatchModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateBatch()">
            <div class="field">
              <label>Batch Number (Auto-Generated)</label>
              <input type="text" name="batchNumber" [value]="createBatchForm.batchNumber" disabled style="background: #f7f5f2; font-weight: 700; color: #562200;">
            </div>
            <div class="form-row">
              <div class="field">
                <label>Product Profiles</label>
                <select name="productId" [(ngModel)]="createBatchForm.productId" required>
                  <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Manufacturing Site</label>
                <select name="siteId" [(ngModel)]="createBatchForm.manufacturingSiteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Quantity</label>
                <input type="number" name="qty" [(ngModel)]="createBatchForm.quantityManufactured" required>
              </div>
              <div class="field">
                <label>Unit of Measure</label>
                <select name="unit" [(ngModel)]="createBatchForm.unit" required>
                  <option value="Liters">Liters</option>
                  <option value="Kilograms">Kilograms</option>
                  <option value="Vials">Vials</option>
                  <option value="Capsules">Capsules</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Manufacturing Date</label>
                <input type="date" name="mfgD" [(ngModel)]="createBatchForm.manufacturingDate" required>
              </div>
              <div class="field">
                <label>Expiry Date</label>
                <input type="date" name="expD" [(ngModel)]="createBatchForm.expiryDate" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateBatchModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Start Run</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2. ADD QC TEST MODAL -->
      <div class="modal-overlay" *ngIf="showAddQcModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Record Quality Control Test</h3>
            <button class="close-modal" (click)="showAddQcModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleRecordQcTest()">
            <div class="form-row">
              <div class="field">
                <label>Test Type Name</label>
                <input type="text" name="qcType" [(ngModel)]="addQcForm.testType" placeholder="e.g. Sterility Assay" required>
              </div>
              <div class="field">
                <label>Tested By Staff ID</label>
                <input type="number" name="testedBy" [(ngModel)]="addQcForm.testedById" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Specifications Range</label>
                <input type="text" name="spec" [(ngModel)]="addQcForm.specification" placeholder="e.g. pH: 6.8 - 7.4" required>
              </div>
              <div class="field">
                <label>Observed Result</label>
                <input type="text" name="res" [(ngModel)]="addQcForm.result" placeholder="e.g. pH: 7.2" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Test Date</label>
                <input type="date" name="qcDate" [(ngModel)]="addQcForm.testDate" required>
              </div>
              <div class="field">
                <label>QC Status</label>
                <select name="qcStatus" [(ngModel)]="addQcForm.status" required>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showAddQcModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Record QC</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 3. ADD MATERIAL USAGE MODAL -->
      <div class="modal-overlay" *ngIf="showAddMaterialModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Record Raw Material Dispensed</h3>
            <button class="close-modal" (click)="showAddMaterialModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleRecordMaterial()">
            <div class="field">
              <label>Material Name</label>
              <input type="text" name="matName" [(ngModel)]="addMaterialForm.materialName" placeholder="e.g. Purified Water USP" required>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Lot Number / Batch Reference</label>
                <input type="text" name="matLot" [(ngModel)]="addMaterialForm.materialLotNumber" placeholder="e.g. LOT-W829" required>
              </div>
              <div class="field">
                <label>Quantity Dispensed</label>
                <input type="number" step="0.01" name="matQty" [(ngModel)]="addMaterialForm.quantityUsed" required>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Unit of Measure</label>
                <select name="matUnit" [(ngModel)]="addMaterialForm.unit" required>
                  <option value="Liters">Liters</option>
                  <option value="Kilograms">Kilograms</option>
                  <option value="Grams">Grams</option>
                </select>
              </div>
              <div class="field">
                <label>Log Status</label>
                <input type="text" name="matStatus" [(ngModel)]="addMaterialForm.status" placeholder="e.g. Verified" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showAddMaterialModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Add Material</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 4. ELECTRONIC SIGNATURE DIALOG -->
      <div class="modal-overlay" *ngIf="showSignatureModal()">
        <div class="modal-card" style="max-width: 420px;">
          <div class="modal-header">
            <h3>Electronic Signature Release Gate</h3>
            <button class="close-modal" (click)="showSignatureModal.set(false)">×</button>
          </div>
          <div class="details-pane" style="font-size: 13.5px; margin-bottom: 8px;">
            <p>You are applying a legally binding electronic signature to release this batch for public logistics dispatch.</p>
            <div class="detail-item"><span class="label">Action:</span> Transition to <strong>Released (REL)</strong></div>
            <div class="detail-item"><span class="label">Meaning:</span> RELEASED</div>
          </div>
          <form (ngSubmit)="executeSignatureTransition()">
            <div class="field">
              <label>Verify Identity Password</label>
              <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showSignatureModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="signing()">
                {{ signing() ? 'Signing...' : 'Verify & Release' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .batches-container {
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
    .status-ip {
      background: #e8f1fa;
      color: #1d5f9e;
      border-color: #bbdefb;
    }
    .status-qch {
      background: #fff8e1;
      color: #f57f17;
      border-color: #ffe082;
    }
    .status-rel {
      background: #e8f5e9;
      color: #2e7d32;
      border-color: #c8e6c9;
    }
    .status-recalled {
      background: #fbeceb;
      color: #b3261e;
      border-color: #ffcdd2;
    }
    .status-rejected {
      background: #f7f5f2;
      color: #7a6a5e;
      border-color: #ece4dc;
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
export class BatchesComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  batches = signal<any[]>([]);
  products = signal<any[]>([]);
  sites = signal<any[]>([]);

  // Selection
  selectedBatch = signal<any | null>(null);
  detailTab = signal<'qc' | 'materials' | 'signatures'>('qc');

  // Sub-logs
  qcTests = signal<any[]>([]);
  rawMaterials = signal<any[]>([]);
  signatureHistory = signal<any[]>([]);

  // Pagination states
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  // Modals Visibility
  showCreateBatchModal = signal<boolean>(false);
  showAddQcModal = signal<boolean>(false);
  showAddMaterialModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // Form Models
  createBatchForm = {
    batchNumber: '',
    productId: null as any,
    manufacturingDate: '',
    expiryDate: '',
    quantityManufactured: 500,
    unit: 'Vials',
    manufacturingSiteId: null as any,
    status: 'InProgress'
  };

  addQcForm = {
    testType: '',
    testedById: 1,
    testDate: '',
    result: '',
    specification: '',
    status: 'PASS'
  };

  addMaterialForm = {
    materialName: '',
    materialLotNumber: '',
    quantityUsed: 100,
    unit: 'Kilograms',
    status: 'Verified'
  };

  // Electronic Signature release details
  signaturePassword = '';
  targetStatus = signal<string>('');
  signing = signal<boolean>(false);

  ngOnInit() {
    this.fetchProducts();
    this.fetchSites();
    this.fetchBatches();
  }

  fetchBatches() {
    this.apiService.getBatches().subscribe({
      next: (data) => {
        this.batches.set(data || []);
        this.totalPages.set(Math.ceil(data.length / this.pageSize) || 1);
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching batch records register.')
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

  paginatedBatches() {
    const start = (this.page() - 1) * this.pageSize;
    return this.batches().slice(start, start + this.pageSize);
  }

  getProductName(productId: number): string {
    const p = this.products().find(item => item.productId === productId);
    return p ? p.productName : `Prod ID: ${productId}`;
  }

  getSiteName(siteId: number): string {
    const s = this.sites().find(item => item.siteId === siteId);
    return s ? s.siteName : `Site ID: ${siteId}`;
  }

  viewBatchDetails(batch: any) {
    this.selectedBatch.set(batch);
    this.detailTab.set('qc');
    this.clearMessages();
    this.fetchQcTests(batch.batchId);
    this.fetchRawMaterials(batch.batchId);
    this.fetchSignatureHistory(batch.batchNumber);
  }

  fetchQcTests(batchId: number) {
    this.apiService.getQCTestsByBatchId(batchId).subscribe({
      next: (data) => this.qcTests.set(data || []),
      error: () => this.qcTests.set([])
    });
  }

  fetchRawMaterials(batchId: number) {
    this.apiService.getRawMaterialsByBatchId(batchId).subscribe({
      next: (data) => this.rawMaterials.set(data || []),
      error: () => this.rawMaterials.set([])
    });
  }

  fetchSignatureHistory(batchNum: string) {
    this.apiService.getSignatures('BatchRecord', batchNum).subscribe({
      next: (res) => {
        if (res.success) {
          this.signatureHistory.set(res.data || []);
        }
      },
      error: () => this.signatureHistory.set([])
    });
  }

  openCreateBatchModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.createBatchForm = {
      batchNumber: `BATCH-${rand}`,
      productId: this.products()[0]?.productId || null,
      manufacturingDate: new Date().toISOString().substring(0, 10),
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      quantityManufactured: 2500,
      unit: 'Vials',
      manufacturingSiteId: this.sites()[0]?.siteId || null,
      status: 'InProgress'
    };
    this.showCreateBatchModal.set(true);
    this.clearMessages();
  }

  handleCreateBatch() {
    const payload = {
      ...this.createBatchForm,
      productId: parseInt(this.createBatchForm.productId, 10),
      manufacturingSiteId: parseInt(this.createBatchForm.manufacturingSiteId, 10)
    };

    this.apiService.createBatch(payload).subscribe({
      next: () => {
        this.showSuccess('Batch manufacturing run registered successfully in InProgress state.');
        this.showCreateBatchModal.set(false);
        this.fetchBatches();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to initialize batch run.')
    });
  }

  openAddQcModal() {
    this.addQcForm = {
      testType: 'Sterility Testing',
      testedById: Number(localStorage.getItem('pt_userId')) || 1,
      testDate: new Date().toISOString().substring(0, 10),
      result: 'Negative (Sterile)',
      specification: 'Must be Sterile (No growth)',
      status: 'PASS'
    };
    this.showAddQcModal.set(true);
    this.clearMessages();
  }

  handleRecordQcTest() {
    const payload = {
      ...this.addQcForm,
      batchId: this.selectedBatch().batchId
    };

    this.apiService.createQCTest(payload).subscribe({
      next: () => {
        this.showSuccess('Quality Control assay test log recorded.');
        this.showAddQcModal.set(false);
        this.fetchQcTests(payload.batchId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to record QC test.')
    });
  }

  openAddMaterialModal() {
    this.addMaterialForm = {
      materialName: 'Active Pharmaceutical Ingredient (API)',
      materialLotNumber: 'LOT-API-1082',
      quantityUsed: 12.5,
      unit: 'Kilograms',
      status: 'Verified'
    };
    this.showAddMaterialModal.set(true);
    this.clearMessages();
  }

  handleRecordMaterial() {
    const payload = {
      ...this.addMaterialForm,
      batchId: this.selectedBatch().batchId
    };

    this.apiService.createRawMaterial(payload).subscribe({
      next: () => {
        this.showSuccess('Dispensed raw material lot cataloged.');
        this.showAddMaterialModal.set(false);
        this.fetchRawMaterials(payload.batchId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to record raw material usage.')
    });
  }

  transitionStateDirect(target: string) {
    this.clearMessages();
    const batchId = this.selectedBatch().batchId;

    this.apiService.updateBatch(batchId, { ...this.selectedBatch(), status: target }).subscribe({
      next: () => {
        this.showSuccess(`Batch state successfully transitioned directly to: ${target}`);
        
        // Reload details
        const updatedBatch = { ...this.selectedBatch(), status: target };
        this.selectedBatch.set(updatedBatch);
        this.fetchBatches();
      },
      error: (err) => this.showError(`Direct status transition failed: ${err.error?.message || err.message}`)
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
    if (val === 'Released') {
      this.openSignatureModal('Released');
    } else if (val) {
      this.transitionStateDirect(val);
    }
    e.target.value = '';
  }

  executeSignatureTransition() {
    this.signing.set(true);
    this.clearMessages();

    // Create releasing signature:
    // POST /pharmaTrack/identityAccess/signatures
    const signaturePayload = {
      entityType: 'BatchRecord',
      entityId: this.selectedBatch().batchNumber,
      entityVersion: '1',
      meaning: 'RELEASED'
    };

    this.apiService.signEntity(signaturePayload).subscribe({
      next: (res) => {
        if (res.success) {
          // Transition:
          // POST /pharmaTrack/batchManufacturing/workflow/transition
          const transitionPayload = {
            entityType: 'BatchRecord',
            entityId: this.selectedBatch().batchNumber,
            targetStatus: 'REL', // REL maps to Released in database
            reason: `Batch released for clinical logistics dispatch. Signature ID ${res.data?.signatureId}`
          };

          this.apiService.transitionWorkflow('batchManufacturing', transitionPayload).subscribe({
            next: () => {
              this.signing.set(false);
              this.showSignatureModal.set(false);
              this.showSuccess('Batch successfully signed and transitioned to Released state.');

              // Reload details
              const updatedBatch = { ...this.selectedBatch(), status: 'Released' };
              this.selectedBatch.set(updatedBatch);
              this.fetchBatches();
              this.fetchSignatureHistory(updatedBatch.batchNumber);
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
