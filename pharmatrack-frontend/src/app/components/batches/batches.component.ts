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
    <!-- ================= MASTER VIEW: Batches list ================= -->
    <div *ngIf="!selectedBatch()">
      <div class="page-head">
        <div>
          <h2 class="page-title">Batch Manufacturing Register</h2>
          <p class="page-sub">Track production progress, record raw material lots, and manage quality release protocols.</p>
        </div>
        <button class="btn btn-primary btn-create" (click)="openCreateBatchModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Batch
        </button>
      </div>

      <!-- KPI cards -->
      <div class="kpi-grid">
        <div class="kpi-card tone-accent">
          <div class="kpi-top">
            <span class="kpi-label">Total Batches</span>
            <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg></span>
          </div>
          <div class="kpi-value">{{ batches().length }}</div>
        </div>
        <div class="kpi-card tone-blue">
          <div class="kpi-top">
            <span class="kpi-label">Records Per Page</span>
            <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></span>
          </div>
          <div class="kpi-value">{{ pageSize }}</div>
        </div>
        <div class="kpi-card tone-warning">
          <div class="kpi-top">
            <span class="kpi-label">Current Page</span>
            <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
          </div>
          <div class="kpi-value">{{ page() }}</div>
        </div>
        <div class="kpi-card tone-neutral">
          <div class="kpi-top">
            <span class="kpi-label">Total Pages</span>
            <span class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
          </div>
          <div class="kpi-value">{{ totalPages() }}</div>
        </div>
      </div>

      <!-- Filter row -->
      <div class="filter-row">
        <div class="input-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg>
          <input type="text" placeholder="Search batches, products, lots...">
        </div>
        <div class="filter-select">
          <svg class="funnel-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select aria-label="Filter by Status">
            <option value="">All</option>
            <option value="InProgress">InProgress</option>
            <option value="QCHold">QCHold</option>
            <option value="Released">Released</option>
            <option value="Rejected">Rejected</option>
            <option value="Recalled">Recalled</option>
          </select>
          <svg class="caret-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>Manufacturing Batches</h3>
          <span class="count">{{ batches().length }} total</span>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <thead>
              <tr>
                <th>Batch Number</th>
                <th>Target Product</th>
                <th>Quantity Manufactured</th>
                <th>Mfg Date</th>
                <th>Exp Date</th>
                <th>Manufacturing Site</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let batch of paginatedBatches()">
                <td><span class="batch-id">{{ batch.batchNumber }}</span></td>
                <td class="name-cell">{{ getProductName(batch.productId) }}</td>
                <td>{{ batch.quantityManufactured }} {{ batch.unit }}</td>
                <td>{{ batch.manufacturingDate }}</td>
                <td>{{ batch.expiryDate }}</td>
                <td>{{ getSiteName(batch.manufacturingSiteId) }}</td>
                <td>
                  <span class="badge-status"
                    [class.badge-progress]="batch.status === 'InProgress'"
                    [class.badge-submitted]="batch.status === 'QCHold' || batch.status === 'QCH'"
                    [class.badge-active]="batch.status === 'Released' || batch.status === 'REL'"
                    [class.badge-critical]="batch.status === 'Recalled'"
                    [class.badge-rejected]="batch.status === 'Rejected'">
                    {{ batch.status }}
                  </span>
                </td>
                <td>
                  <div class="row-actions">
                    <button type="button" class="icon-menu-btn" aria-label="Row actions">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    <div class="row-menu">
                      <button type="button" class="dropdown-item" (click)="viewBatchDetails(batch)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="batches().length === 0">
                <td colspan="8" class="empty-state">No batch runs recorded.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="batches().length > 0">
          <span>Showing {{ paginatedBatches().length }} of {{ batches().length }} &middot; Page {{ page() }} of {{ totalPages() }}</span>
          <div class="pager">
            <button [disabled]="page() === 1" (click)="page.set(page() - 1)" aria-label="Previous page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" aria-label="Next page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= DETAIL VIEW: side-by-side tabs on the same page ================= -->
    <div *ngIf="selectedBatch()">
      <div class="breadcrumb">
        <span class="crumb-link" (click)="selectedBatch.set(null)">Batches</span> / <b>{{ selectedBatch().batchNumber }}</b>
      </div>

      <div class="page-head">
        <div>
          <h2 class="page-title">Batch Run: {{ selectedBatch().batchNumber }}</h2>
          <p class="page-sub">Production progress, raw material usage, in-process tests and QC release.</p>
        </div>
        <button class="btn btn-secondary" (click)="selectedBatch.set(null)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Register
        </button>
      </div>

      <!-- Summary bar + workflow controls -->
      <div class="detail-summary">
        <div class="sum-item">
          <div class="sum-k">Status</div>
          <div class="sum-v">
            <span class="badge-status"
              [class.badge-progress]="selectedBatch().status === 'InProgress'"
              [class.badge-submitted]="selectedBatch().status === 'QCHold' || selectedBatch().status === 'QCH'"
              [class.badge-active]="selectedBatch().status === 'Released' || selectedBatch().status === 'REL'"
              [class.badge-critical]="selectedBatch().status === 'Recalled'"
              [class.badge-rejected]="selectedBatch().status === 'Rejected'">
              {{ selectedBatch().status }}
            </span>
          </div>
        </div>
        <div class="sum-item"><div class="sum-k">Product</div><div class="sum-v">{{ getProductName(selectedBatch().productId) }}</div></div>
        <div class="sum-item"><div class="sum-k">Quantity</div><div class="sum-v">{{ selectedBatch().quantityManufactured }} {{ selectedBatch().unit }}</div></div>
        <div class="sum-item"><div class="sum-k">Mfg Date</div><div class="sum-v">{{ selectedBatch().manufacturingDate }}</div></div>
        <div class="sum-item"><div class="sum-k">Expiry</div><div class="sum-v">{{ selectedBatch().expiryDate }}</div></div>

        <div class="sum-spacer"></div>

        <!-- InProgress: Send button transitions to QCHold (non-signature transition) -->
        <button class="btn btn-primary" *ngIf="selectedBatch().status === 'InProgress'" (click)="transitionStateDirect('QCHold')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          Send
        </button>

        <!-- QCHold: filter dropdown with Released, Recalled, Rejected -->
        <div class="qc-action" *ngIf="selectedBatch().status === 'QCHold' || selectedBatch().status === 'QCH'">
          <label>QC Review Action</label>
          <select class="select" (change)="onStatusChangeSelect($event)">
            <option value="">-- Choose Status --</option>
            <option value="Released">Released (Signature-Gated)</option>
            <option value="Recalled">Recalled</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      <!-- Detail Tabs -->
      <div class="detail-tabs">
        <button [class.active]="detailTab() === 'qc'" (click)="detailTab.set('qc')">QC Tests</button>
        <button [class.active]="detailTab() === 'materials'" (click)="detailTab.set('materials')">Raw Materials</button>
        <button [class.active]="detailTab() === 'signatures'" (click)="detailTab.set('signatures')">Workflow Signatures</button>
      </div>

      <!-- Tab contents (no navigation away) -->
      <div class="tab-panel">
        <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

        <!-- 1. QC TESTS TAB -->
        <div *ngIf="detailTab() === 'qc'">
          <div class="tab-bar">
            <h3>QC Inspection Protocols</h3>
            <button class="btn btn-outline" (click)="openAddQcModal()" [disabled]="selectedBatch().status === 'Released' || selectedBatch().status === 'REL'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Record QC Test
            </button>
          </div>
          <div class="table-scroll">
            <table>
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
                  <td class="name-cell">{{ t.testId }}</td>
                  <td>{{ t.testType }}</td>
                  <td>{{ t.testDate }}</td>
                  <td>{{ t.specification }}</td>
                  <td>{{ t.result }}</td>
                  <td>
                    <span class="badge-status" [class.badge-active]="t.status === 'PASS'" [class.badge-rejected]="t.status !== 'PASS'">
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
          <div class="tab-bar">
            <h3>Raw Material Lot Dispensing Log</h3>
            <button class="btn btn-outline" (click)="openAddMaterialModal()" [disabled]="selectedBatch().status === 'Released' || selectedBatch().status === 'REL'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Record Material Usage
            </button>
          </div>
          <div class="table-scroll">
            <table>
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
                  <td class="name-cell">{{ m.usageId }}</td>
                  <td class="name-cell">{{ m.materialName }}</td>
                  <td>{{ m.materialLotNumber }}</td>
                  <td>{{ m.quantityUsed }} {{ m.unit }}</td>
                  <td><span class="badge-status badge-rust">{{ m.status }}</span></td>
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
          <div class="tab-bar"><h3>Electronic Signature Release Logs</h3></div>
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
                  <td>{{ s.signerName }}</td>
                  <td><span class="badge-status badge-rust">{{ s.meaning }}</span></td>
                  <td>v{{ s.entityVersion }}</td>
                  <td>{{ s.signedAt | date:'medium' }}</td>
                  <td class="hash-cell" [title]="s.signatureHash">{{ s.signatureHash }}</td>
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

    <!-- ================= MODALS ================= -->

    <!-- 1. CREATE BATCH MODAL -->
    <div class="modal-overlay" *ngIf="showCreateBatchModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showCreateBatchModal)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Create Manufacturing Batch</h2>
        <form (ngSubmit)="handleCreateBatch()">
          <div class="form-grid">
            <div class="field full">
              <label>Batch Number</label>
              <input type="text" name="batchNumber" [value]="createBatchForm.batchNumber" disabled>
              <span class="autofill-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Auto-generated
              </span>
            </div>
            <div class="field">
              <label>Product Profiles <span class="req">*</span></label>
              <select name="productId" [(ngModel)]="createBatchForm.productId" required>
                <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Manufacturing Site <span class="req">*</span></label>
              <select name="siteId" [(ngModel)]="createBatchForm.manufacturingSiteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Quantity <span class="req">*</span></label>
              <input type="number" name="qty" [(ngModel)]="createBatchForm.quantityManufactured" required>
            </div>
            <div class="field">
              <label>Unit of Measure <span class="req">*</span></label>
              <select name="unit" [(ngModel)]="createBatchForm.unit" required>
                <option value="Liters">Liters</option>
                <option value="Kilograms">Kilograms</option>
                <option value="Vials">Vials</option>
                <option value="Capsules">Capsules</option>
              </select>
            </div>
            <div class="field">
              <label>Manufacturing Date <span class="req">*</span></label>
              <input type="date" name="mfgD" [(ngModel)]="createBatchForm.manufacturingDate" required>
            </div>
            <div class="field">
              <label>Expiry Date <span class="req">*</span></label>
              <input type="date" name="expD" [(ngModel)]="createBatchForm.expiryDate" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Start Run</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. ADD QC TEST MODAL -->
    <div class="modal-overlay" *ngIf="showAddQcModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showAddQcModal)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Record Quality Control Test</h2>
        <form (ngSubmit)="handleRecordQcTest()">
          <div class="form-grid">
            <div class="field">
              <label>Test Type Name <span class="req">*</span></label>
              <input type="text" name="qcType" [(ngModel)]="addQcForm.testType" placeholder="e.g. Sterility Assay" required>
            </div>
            <div class="field">
              <label>Tested By Staff ID <span class="req">*</span></label>
              <input type="number" name="testedBy" [(ngModel)]="addQcForm.testedById" required>
            </div>
            <div class="field">
              <label>Specifications Range <span class="req">*</span></label>
              <input type="text" name="spec" [(ngModel)]="addQcForm.specification" placeholder="e.g. pH: 6.8 - 7.4" required>
            </div>
            <div class="field">
              <label>Observed Result <span class="req">*</span></label>
              <input type="text" name="res" [(ngModel)]="addQcForm.result" placeholder="e.g. pH: 7.2" required>
            </div>
            <div class="field">
              <label>Test Date <span class="req">*</span></label>
              <input type="date" name="qcDate" [(ngModel)]="addQcForm.testDate" required>
            </div>
            <div class="field">
              <label>QC Status <span class="req">*</span></label>
              <select name="qcStatus" [(ngModel)]="addQcForm.status" required>
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Record QC</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. ADD MATERIAL USAGE MODAL -->
    <div class="modal-overlay" *ngIf="showAddMaterialModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showAddMaterialModal)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Record Raw Material Dispensed</h2>
        <form (ngSubmit)="handleRecordMaterial()">
          <div class="form-grid">
            <div class="field full">
              <label>Material Name <span class="req">*</span></label>
              <input type="text" name="matName" [(ngModel)]="addMaterialForm.materialName" placeholder="e.g. Purified Water USP" required>
            </div>
            <div class="field">
              <label>Lot Number / Batch Reference <span class="req">*</span></label>
              <input type="text" name="matLot" [(ngModel)]="addMaterialForm.materialLotNumber" placeholder="e.g. LOT-W829" required>
            </div>
            <div class="field">
              <label>Quantity Dispensed <span class="req">*</span></label>
              <input type="number" step="0.01" name="matQty" [(ngModel)]="addMaterialForm.quantityUsed" required>
            </div>
            <div class="field">
              <label>Unit of Measure <span class="req">*</span></label>
              <select name="matUnit" [(ngModel)]="addMaterialForm.unit" required>
                <option value="Liters">Liters</option>
                <option value="Kilograms">Kilograms</option>
                <option value="Grams">Grams</option>
              </select>
            </div>
            <div class="field">
              <label>Log Status <span class="req">*</span></label>
              <input type="text" name="matStatus" [(ngModel)]="addMaterialForm.status" placeholder="e.g. Verified" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Add Material</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 4. ELECTRONIC SIGNATURE DIALOG -->
    <div class="modal-overlay" *ngIf="showSignatureModal()">
      <div class="modal" style="max-width: 460px;">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showSignatureModal)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Electronic Signature Release Gate</h2>
        <p class="sig-note">You are applying a legally binding electronic signature to release this batch for public logistics dispatch.</p>
        <div class="sig-line"><span class="k">Action</span> Transition to <strong>Released (REL)</strong></div>
        <div class="sig-line"><span class="k">Meaning</span> RELEASED</div>
        <form (ngSubmit)="executeSignatureTransition()">
          <div class="field">
            <label>Verify Identity Password <span class="req">*</span></label>
            <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary" [disabled]="signing()">
              {{ signing() ? 'Signing...' : 'Verify & Release' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    /* Business id accent */
    .batch-id { color: var(--accent); font-weight: 700; font-size: 14.5px; }

    /* Breadcrumb back link */
    .crumb-link { color: var(--text-dim); cursor: pointer; }
    .crumb-link:hover { color: var(--accent); text-decoration: underline; }

    /* Detail summary bar */
    .detail-summary {
      display: flex; align-items: center; gap: 40px; flex-wrap: wrap;
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 22px 26px; margin-bottom: 26px;
    }
    .sum-item .sum-k {
      font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase;
      color: var(--text-dim); font-weight: 700; margin-bottom: 8px;
    }
    .sum-item .sum-v { font-size: 16px; font-weight: 700; }
    .sum-spacer { flex: 1; }
    .qc-action { display: flex; flex-direction: column; gap: 6px; }
    .qc-action label {
      font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase;
      color: var(--text-dim); font-weight: 700;
    }

    /* Detail tabs (side-by-side, switch on same page) */
    .detail-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    .detail-tabs button {
      background: none; border: 1px solid transparent; padding: 10px 18px;
      font-size: 14px; font-weight: 600; color: var(--text-dim); cursor: pointer;
      border-radius: var(--radius-sm); font-family: inherit;
      transition: background .15s ease, color .15s ease;
    }
    .detail-tabs button:hover { background: var(--accent-light); color: var(--accent); }
    .detail-tabs button.active { background: var(--accent-light); color: var(--accent); border-color: var(--border); }

    /* Tab panel */
    .tab-panel {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 8px 24px 12px;
    }
    .tab-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; }
    .tab-bar h3 { margin: 0; font-size: 17px; font-weight: 800; }

    /* Row action hover / focus menu (pure CSS, no state) */
    .row-actions { position: relative; display: inline-flex; }
    .row-menu {
      position: absolute; right: 0; top: 38px; background: #fff;
      border: 1px solid var(--border); border-radius: var(--radius-md);
      box-shadow: 0 14px 34px rgba(30,16,8,.16); min-width: 150px; padding: 6px;
      display: none; z-index: 20;
    }
    .row-actions:hover .row-menu, .row-actions:focus-within .row-menu { display: block; }

    /* Alerts */
    .alert { padding: 10px 14px; border-radius: var(--radius-sm); margin: 14px 0 4px; font-size: 13.5px; }
    .alert-error { background: var(--danger-light); color: var(--danger); border: 1px solid #f5c2c0; }
    .alert-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }

    /* Empty state row */
    .empty-state { text-align: center; color: var(--text-dim); font-style: italic; padding: 28px !important; }

    /* Signature dialog lines */
    .sig-note { font-size: 13.5px; color: var(--text-dim); line-height: 1.6; margin: 0 0 14px; }
    .sig-line { font-size: 14px; margin-bottom: 8px; }
    .sig-line .k { font-weight: 700; color: var(--text-dim); display: inline-block; width: 80px; }

    /* Modal helpers */
    .modal-footer { gap: 12px; }
    .field.full { grid-column: 1 / -1; }
    .hash-cell {
      font-family: monospace; font-size: 11px; max-width: 250px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-dim);
    }

    /* Funnel status filter dropdown */
    .filter-select { position: relative; display: inline-flex; align-items: center; min-width: 200px; }
    .filter-select .funnel-ico { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: var(--text-dim); pointer-events: none; }
    .filter-select .caret-ico { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-dim); pointer-events: none; }
    .filter-select select { appearance: none; -webkit-appearance: none; -moz-appearance: none; width: 100%; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 11px 36px 11px 38px; font-size: 14px; background: transparent; color: var(--text); font-family: inherit; cursor: pointer; }
    .filter-select select:focus { outline: none; border-color: var(--accent); }
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

  // Close an input modal only after confirming discard of unsaved changes
  closeWithConfirm(modalSignal: { set: (v: boolean) => void }) {
    if (window.confirm('Discard unsaved changes?')) {
      modalSignal.set(false);
    }
  }
}
