import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-batches',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ================= MASTER VIEW: Batches list ================= -->
    <div *ngIf="!selectedBatch()" class="bmqc">
      <div class="page-head">
        <div>
          <h2 class="page-title">Batch Manufacturing &amp; Quality Control</h2>
          <p class="page-sub">Batch records, raw material usage, in-process tests, and QC release</p>
        </div>
        <span class="tip" [attr.data-tip]="canCreateBatch() ? 'Create Batch' : 'Only a Manufacturing Supervisor can create batches'">
          <button class="btn btn-primary btn-create" (click)="openCreateBatchModal()" [disabled]="!canCreateBatch()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Batch
          </button>
        </span>
      </div>

      <!-- Stat cards -->
      <div class="stats">
        <div class="stat">
          <div class="stat-row">
            <span class="stat-label">Total Batches</span>
            <span class="stat-ic ic-amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg></span>
          </div>
          <div class="stat-num">{{ batches().length }}</div>
        </div>
        <div class="stat">
          <div class="stat-row">
            <span class="stat-label">In Production</span>
            <span class="stat-ic ic-blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></span>
          </div>
          <div class="stat-num tx-amber">{{ inProductionCount() }}</div>
        </div>
        <div class="stat">
          <div class="stat-row">
            <span class="stat-label">QC Passed</span>
            <span class="stat-ic ic-green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14.1 9 11.1"/></svg></span>
          </div>
          <div class="stat-num tx-green">{{ qcPassedCount() }}</div>
        </div>
        <div class="stat">
          <div class="stat-row">
            <span class="stat-label">QC Failed</span>
            <span class="stat-ic ic-red"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg></span>
          </div>
          <div class="stat-num tx-red">{{ qcFailedCount() }}</div>
        </div>
      </div>

      <!-- Toolbar: search + status dropdown -->
      <div class="toolbar">
        <div class="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg>
          <input type="text" placeholder="Search batches, products, lots…"
            [value]="searchTerm()" (input)="onSearch($event)">
        </div>
        <div class="status-filter">
          <button type="button" class="status-trigger" [class.filtered]="statusFilter()" (click)="toggleStatusMenu($event)" aria-label="Filter by status" title="Filter by status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="status-menu" [class.open]="statusMenuOpen()">
            <button type="button" [class.active]="statusFilter() === ''" (click)="selectStatus('')">All statuses</button>
            <button type="button" [class.active]="statusFilter() === 'InProgress'" (click)="selectStatus('InProgress')">InProcess</button>
            <button type="button" [class.active]="statusFilter() === 'QCHold'" (click)="selectStatus('QCHold')">QCHold</button>
            <button type="button" [class.active]="statusFilter() === 'Released'" (click)="selectStatus('Released')">Released</button>
            <button type="button" [class.active]="statusFilter() === 'Rejected'" (click)="selectStatus('Rejected')">Rejected</button>
            <button type="button" [class.active]="statusFilter() === 'Recalled'" (click)="selectStatus('Recalled')">Recalled</button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="card-block">
        <div class="block-head">
          <h3>Manufacturing Batches</h3>
          <span class="count">· {{ filteredBatches().length }} total</span>
          <div class="block-spacer"></div>
          <div class="export-wrap">
            <button type="button" class="btn btn-ghost" (click)="toggleExportMenu($event)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="export-menu" [class.open]="exportMenuOpen()">
              <button type="button" (click)="exportData('pdf')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export as PDF
              </button>
              <button type="button" (click)="exportData('excel')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                Export as Excel
              </button>
            </div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="bmqc-table">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Product</th>
                <th>Supervisor</th>
                <th>Status</th>
                <th>Release Date</th>
                <th class="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let batch of paginatedBatches()">
                <td class="cell-title">
                  <b>{{ batch.batchNumber }}</b>
                  <small>{{ batch.quantityManufactured }} {{ batch.unit }}</small>
                </td>
                <td class="name-cell">{{ getProductName(batch.productId) }}</td>
                <td>{{ getSupervisor(batch) }}</td>
                <td>
                  <span class="badge" [ngClass]="statusClass(batch.status)">{{ batch.status }}</span>
                </td>
                <td>{{ (batch.releaseDate || batch.expiryDate) ? ((batch.releaseDate || batch.expiryDate) | date:'mediumDate') : '—' }}</td>
                <td class="right">
                  <div class="row-actions">
                    <button type="button" class="icon-menu-btn" aria-label="Row actions">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    <div class="row-menu">
                      <button type="button" class="dropdown-item" (click)="viewBatchDetails(batch)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                      <button type="button" class="dropdown-item" (click)="openEditBatchModal(batch)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                        Edit
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredBatches().length === 0">
                <td colspan="6" class="empty-state">No batch runs recorded.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="filteredBatches().length > 0">
          <span>Showing {{ paginatedBatches().length }} of {{ filteredBatches().length }} &middot; Page {{ page() }} of {{ totalPages() }}</span>
          <div class="pager">
            <button [disabled]="page() === 1" (click)="page.set(page() - 1)" aria-label="Previous page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button *ngFor="let p of pages()" class="page-num" [class.active]="p === page()" (click)="page.set(p)">{{ p }}</button>
            <button [disabled]="page() >= totalPages()" (click)="page.set(page() + 1)" aria-label="Next page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= DETAIL VIEW: side-by-side tabs on the same page ================= -->
    <div *ngIf="selectedBatch()" class="bmqc" (pointerdown)="onSwipeStart($event)" (pointerup)="onSwipeEnd($event)">
      <div class="breadcrumb">
        <span class="crumb-link" (click)="selectedBatch.set(null)">Batches</span> / <b>{{ selectedBatch().batchNumber }}</b>
      </div>

      <div class="page-head detail-title-row">
        <div>
          <h2 class="page-title">{{ selectedBatch().batchNumber }}</h2>
          <p class="page-sub">Production progress, raw material usage, in-process tests and QC release.</p>
        </div>
        <span class="badge status-lg" [ngClass]="statusClass(selectedBatch().status)">{{ selectedBatch().status }}</span>
      </div>

      <!-- Summary bar + workflow controls -->
      <div class="detail-summary">
        <div class="sum-item"><div class="sum-k">Product</div><div class="sum-v">{{ getProductName(selectedBatch().productId) }}</div></div>
        <div class="sum-item"><div class="sum-k">Quantity</div><div class="sum-v">{{ selectedBatch().quantityManufactured }} {{ selectedBatch().unit }}</div></div>
        <div class="sum-item"><div class="sum-k">Mfg Date</div><div class="sum-v">{{ selectedBatch().manufacturingDate }}</div></div>
        <div class="sum-item"><div class="sum-k">Expiry</div><div class="sum-v">{{ selectedBatch().expiryDate }}</div></div>

        <div class="sum-spacer"></div>

        <div class="detail-actions">
          <!-- QCHold: dropdown icon (before the send icon) with QC review actions -->
          <div class="review-filter" *ngIf="isQcHold()">
            <button type="button" class="icon-action" [disabled]="!canCreateQcMaterial()" (click)="toggleReviewMenu($event)" aria-label="QC review action" [title]="canCreateQcMaterial() ? 'QC review action' : 'Only a QA Analyst can perform QC review'">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="review-menu" [class.open]="reviewMenuOpen()">
              <button type="button" (click)="chooseReview('Released')">Released</button>
              <button type="button" (click)="chooseReview('Rejected')">Rejected</button>
              <button type="button" (click)="chooseReview('Recalled')">Recalled</button>
            </div>
          </div>

          <!-- Send icon (InProgress → QCHold); tooltip "Sent to QCH" -->
          <span class="tip" data-tip="Sent to QCH">
            <button type="button" class="icon-action send-icon" [disabled]="selectedBatch().status !== 'InProgress'" (click)="sendToQc()" aria-label="Send to QCH">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </span>
        </div>
      </div>

      <!-- Detail Tabs -->
      <div class="detail-tabs">
        <button [class.active]="detailTab() === 'qc'" (click)="detailTab.set('qc')">QC Tests</button>
        <button [class.active]="detailTab() === 'materials'" (click)="detailTab.set('materials')">Raw Materials</button>
      </div>

      <!-- Tab contents (no navigation away) -->
      <div class="tab-panel">
        <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

        <!-- 1. QC TESTS TAB -->
        <div *ngIf="detailTab() === 'qc'">
          <div class="section-bar">
            <h3>QC Tests</h3>
            <div class="section-spacer"></div>
            <span class="tip" [attr.data-tip]="canCreateQcMaterial() ? 'Add QC Test' : 'Only a QA Analyst can create QC tests'">
              <button class="btn btn-primary btn-create" (click)="openAddQcModal()" [disabled]="isReleased() || !canCreateQcMaterial()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Test
              </button>
            </span>
          </div>
          <div class="card-block">
            <div class="table-scroll">
              <table class="bmqc-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Type</th>
                    <th>Tested By</th>
                    <th>Result</th>
                    <th>Specification</th>
                    <th>Status</th>
                    <th class="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of paginatedQcTests()">
                    <td class="cell-title">
                      <b>{{ t.testId }}</b>
                      <small>{{ t.testDate ? (t.testDate | date:'mediumDate') : '' }}</small>
                    </td>
                    <td>{{ t.testType }}</td>
                    <td>{{ getTestedBy(t) }}</td>
                    <td>{{ t.result }}</td>
                    <td>{{ t.specification }}</td>
                    <td><span class="badge" [ngClass]="qcStatusClass(t.status)">{{ t.status }}</span></td>
                    <td class="right">
                      <div class="row-actions">
                        <button type="button" class="icon-menu-btn" aria-label="Row actions">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div class="row-menu">
                          <button type="button" class="dropdown-item" (click)="openViewQc(t)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                          </button>
                          <button type="button" class="dropdown-item" (click)="openEditQc(t)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                            Edit
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="qcTests().length === 0">
                    <td colspan="7" class="empty-state">No QC tests recorded for this batch yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-footer" *ngIf="qcTests().length > 0">
              <span>Showing {{ paginatedQcTests().length }} of {{ qcTests().length }} &middot; Page {{ qcPage() }} of {{ qcTotalPages() }}</span>
              <div class="pager">
                <button [disabled]="qcPage() === 1" (click)="qcPage.set(qcPage() - 1)" aria-label="Previous page">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button *ngFor="let p of qcPages()" class="page-num" [class.active]="p === qcPage()" (click)="qcPage.set(p)">{{ p }}</button>
                <button [disabled]="qcPage() >= qcTotalPages()" (click)="qcPage.set(qcPage() + 1)" aria-label="Next page">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. RAW MATERIALS TAB -->
        <div *ngIf="detailTab() === 'materials'">
          <div class="section-bar">
            <h3>Raw Materials</h3>
            <div class="section-spacer"></div>
            <span class="tip" [attr.data-tip]="canCreateQcMaterial() ? 'Add Raw Material' : 'Only a QA Analyst can create raw materials'">
              <button class="btn btn-primary btn-create" (click)="openAddMaterialModal()" [disabled]="isReleased() || !canCreateQcMaterial()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Material
              </button>
            </span>
          </div>
          <div class="card-block">
            <div class="table-scroll">
              <table class="bmqc-table">
                <thead>
                  <tr>
                    <th>Usage</th>
                    <th>Material</th>
                    <th>Lot Number</th>
                    <th>Quantity Used</th>
                    <th>Status</th>
                    <th class="right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let m of paginatedRawMaterials()">
                    <td class="cell-title"><b>{{ m.usageId }}</b></td>
                    <td class="name-cell">{{ m.materialName }}</td>
                    <td>{{ m.materialLotNumber }}</td>
                    <td>{{ m.quantityUsed }} {{ m.unit }}</td>
                    <td><span class="badge" [ngClass]="materialStatusClass(m.status)">{{ m.status }}</span></td>
                    <td class="right">
                      <div class="row-actions">
                        <button type="button" class="icon-menu-btn" aria-label="Row actions">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                        </button>
                        <div class="row-menu">
                          <button type="button" class="dropdown-item" (click)="openViewMaterial(m)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                            View
                          </button>
                          <button type="button" class="dropdown-item" (click)="openEditMaterial(m)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                            Edit
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="rawMaterials().length === 0">
                    <td colspan="6" class="empty-state">No raw materials registered for this batch run.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="table-footer" *ngIf="rawMaterials().length > 0">
              <span>Showing {{ paginatedRawMaterials().length }} of {{ rawMaterials().length }} &middot; Page {{ materialPage() }} of {{ materialTotalPages() }}</span>
              <div class="pager">
                <button [disabled]="materialPage() === 1" (click)="materialPage.set(materialPage() - 1)" aria-label="Previous page">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button *ngFor="let p of materialPages()" class="page-num" [class.active]="p === materialPage()" (click)="materialPage.set(p)">{{ p }}</button>
                <button [disabled]="materialPage() >= materialTotalPages()" (click)="materialPage.set(materialPage() + 1)" aria-label="Next page">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
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
        <h2 class="with-sub">Create Batch</h2>
        <p class="sub">Fill in the batch record details below</p>
        <form (ngSubmit)="handleCreateBatch()">
          <div class="form-grid">
            <div class="field">
              <label>Product <span class="req">*</span></label>
              <select name="productId" [(ngModel)]="createBatchForm.productId" required>
                <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Batch Number <span class="req">*</span></label>
              <input type="text" name="batchNumber" [(ngModel)]="createBatchForm.batchNumber" placeholder="e.g. BATCH-2026-231" required>
            </div>
            <div class="field">
              <label>Manufacturing Site <span class="req">*</span></label>
              <select name="siteId" [(ngModel)]="createBatchForm.manufacturingSiteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
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
            <div class="field">
              <label>Quantity Manufactured <span class="req">*</span></label>
              <input type="number" name="qty" [(ngModel)]="createBatchForm.quantityManufactured" placeholder="e.g. 30000" required>
            </div>
            <div class="field">
              <label>Unit <span class="req">*</span></label>
              <select name="unit" [(ngModel)]="createBatchForm.unit" required>
                <option value="Tablets">Tablets</option>
                <option value="Vials">Vials</option>
                <option value="Capsules">Capsules</option>
                <option value="Litres">Litres</option>
                <option value="Kg">Kg</option>
                <option value="Tons">Tons</option>
              </select>
            </div>
            <div class="field">
              <label>Status</label>
              <input type="text" value="InProcess" disabled>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 1b. EDIT BATCH MODAL -->
    <div class="modal-overlay" *ngIf="showEditBatchModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showEditBatchModal)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Edit Manufacturing Batch</h2>
        <form (ngSubmit)="handleUpdateBatch()">
          <div class="form-grid">
            <div class="field full">
              <label>Batch Number</label>
              <input type="text" name="ebBatchNumber" [value]="editBatchForm.batchNumber" disabled>
            </div>
            <div class="field">
              <label>Product Profiles <span class="req">*</span></label>
              <select name="ebProductId" [(ngModel)]="editBatchForm.productId" required>
                <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Manufacturing Site <span class="req">*</span></label>
              <select name="ebSiteId" [(ngModel)]="editBatchForm.manufacturingSiteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Quantity Manufactured <span class="req">*</span></label>
              <input type="number" name="ebQty" [(ngModel)]="editBatchForm.quantityManufactured" required>
            </div>
            <div class="field">
              <label>Unit <span class="req">*</span></label>
              <select name="ebUnit" [(ngModel)]="editBatchForm.unit" required>
                <option value="Tablets">Tablets</option>
                <option value="Vials">Vials</option>
                <option value="Capsules">Capsules</option>
                <option value="Litres">Litres</option>
                <option value="Kg">Kg</option>
                <option value="Tons">Tons</option>
              </select>
            </div>
            <div class="field">
              <label>Manufacturing Date <span class="req">*</span></label>
              <input type="date" name="ebMfgD" [(ngModel)]="editBatchForm.manufacturingDate" required>
            </div>
            <div class="field">
              <label>Expiry Date <span class="req">*</span></label>
              <input type="date" name="ebExpD" [(ngModel)]="editBatchForm.expiryDate" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Save</button>
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
        <h2 class="with-sub">Create QC Test</h2>
        <p class="sub">Record an in-process or finished-product test</p>
        <form (ngSubmit)="handleRecordQcTest()">
          <div class="form-grid">
            <div class="field full">
              <label>Batch</label>
              <input type="text" [value]="selectedBatch()?.batchNumber" disabled>
            </div>
            <div class="field">
              <label>Test Type <span class="req">*</span></label>
              <select name="qcType" [(ngModel)]="addQcForm.testType" required>
                <option value="Assay">Assay</option>
                <option value="Dissolution">Dissolution</option>
                <option value="Sterility">Sterility</option>
                <option value="Microbial">Microbial</option>
                <option value="Stability">Stability</option>
              </select>
            </div>
            <div class="field">
              <label>Tested By <span class="req">*</span></label>
              <select name="qcBy" [(ngModel)]="addQcForm.testedByName" required>
                <option value="Arjun Rao">Arjun Rao</option>
                <option value="Nita Shah">Nita Shah</option>
                <option value="Meera Nair">Meera Nair</option>
              </select>
            </div>
            <div class="field">
              <label>Test Date <span class="req">*</span></label>
              <input type="date" name="qcDate" [(ngModel)]="addQcForm.testDate" required>
            </div>
            <div class="field">
              <label>Result <span class="req">*</span></label>
              <input type="text" name="res" [(ngModel)]="addQcForm.result" placeholder="e.g. 99.2%" required>
            </div>
            <div class="field">
              <label>Specification <span class="req">*</span></label>
              <input type="text" name="spec" [(ngModel)]="addQcForm.specification" placeholder="e.g. 95 – 105%" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Save</button>
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
        <h2 class="with-sub">Create Raw Material</h2>
        <p class="sub">Record raw-material consumption for this batch</p>
        <form (ngSubmit)="handleRecordMaterial()">
          <div class="form-grid">
            <div class="field full">
              <label>Batch</label>
              <input type="text" [value]="selectedBatch()?.batchNumber" disabled>
            </div>
            <div class="field full">
              <label>Material Name <span class="req">*</span></label>
              <input type="text" name="matName" [(ngModel)]="addMaterialForm.materialName" placeholder="e.g. Microcrystalline Cellulose" required>
            </div>
            <div class="field">
              <label>Material Lot Number <span class="req">*</span></label>
              <input type="text" name="matLot" [(ngModel)]="addMaterialForm.materialLotNumber" placeholder="e.g. MCC-8841" required>
            </div>
            <div class="field">
              <label>Status <span class="req">*</span></label>
              <select name="matStatus" [(ngModel)]="addMaterialForm.status" required>
                <option value="Consumed">Consumed</option>
                <option value="Quarantined">Quarantined</option>
              </select>
            </div>
            <div class="field">
              <label>Quantity Used <span class="req">*</span></label>
              <input type="number" step="0.01" name="matQty" [(ngModel)]="addMaterialForm.quantityUsed" placeholder="e.g. 12" required>
            </div>
            <div class="field">
              <label>Unit <span class="req">*</span></label>
              <select name="matUnit" [(ngModel)]="addMaterialForm.unit" required>
                <option value="Kg">Kg</option>
                <option value="g">g</option>
                <option value="Litres">Litres</option>
                <option value="mL">mL</option>
                <option value="Units">Units</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3a. VIEW QC TEST MODAL (read-only) -->
    <div class="modal-overlay bmqc" *ngIf="showViewQcModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showViewQcModal.set(false)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="with-sub">QC Test Details</h2>
        <p class="sub">{{ viewQc()?.testId }}</p>
        <div class="detail-grid">
          <div class="detail-field"><label>Test ID</label><div class="value">{{ viewQc()?.testId }}</div></div>
          <div class="detail-field"><label>Batch</label><div class="value">{{ selectedBatch()?.batchNumber }}</div></div>
          <div class="detail-field"><label>Test Type</label><div class="value">{{ viewQc()?.testType }}</div></div>
          <div class="detail-field"><label>Tested By</label><div class="value">{{ getTestedBy(viewQc()) }}</div></div>
          <div class="detail-field"><label>Test Date</label><div class="value">{{ viewQc()?.testDate ? (viewQc()?.testDate | date:'mediumDate') : '—' }}</div></div>
          <div class="detail-field"><label>Status</label><div class="value"><span class="badge" [ngClass]="qcStatusClass(viewQc()?.status)">{{ viewQc()?.status }}</span></div></div>
          <div class="detail-field"><label>Result</label><div class="value">{{ viewQc()?.result }}</div></div>
          <div class="detail-field"><label>Specification</label><div class="value">{{ viewQc()?.specification }}</div></div>
        </div>
      </div>
    </div>

    <!-- 3b. EDIT QC TEST MODAL -->
    <div class="modal-overlay" *ngIf="showEditQcModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showEditQcModal)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="with-sub">Edit QC Test</h2>
        <p class="sub">Update the QC test record</p>
        <form (ngSubmit)="handleUpdateQc()">
          <div class="form-grid">
            <div class="field">
              <label>Test ID</label>
              <input type="text" name="eqId" [value]="editQcForm.testId" disabled>
            </div>
            <div class="field">
              <label>Test Type <span class="req">*</span></label>
              <select name="eqType" [(ngModel)]="editQcForm.testType" required>
                <option value="Assay">Assay</option>
                <option value="Dissolution">Dissolution</option>
                <option value="Sterility">Sterility</option>
                <option value="Microbial">Microbial</option>
                <option value="Stability">Stability</option>
              </select>
            </div>
            <div class="field">
              <label>Tested By <span class="req">*</span></label>
              <input type="text" name="eqBy" [(ngModel)]="editQcForm.testedByName" required>
            </div>
            <div class="field">
              <label>Test Date <span class="req">*</span></label>
              <input type="date" name="eqDate" [(ngModel)]="editQcForm.testDate" required>
            </div>
            <div class="field">
              <label>Result <span class="req">*</span></label>
              <input type="text" name="eqRes" [(ngModel)]="editQcForm.result" required>
            </div>
            <div class="field">
              <label>Specification <span class="req">*</span></label>
              <input type="text" name="eqSpec" [(ngModel)]="editQcForm.specification" required>
            </div>
            <div class="field">
              <label>Status <span class="req">*</span></label>
              <select name="eqStatus" [(ngModel)]="editQcForm.status" required>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
                <option value="Retest">Retest</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3c. VIEW RAW MATERIAL MODAL (read-only) -->
    <div class="modal-overlay bmqc" *ngIf="showViewMaterialModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showViewMaterialModal.set(false)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="with-sub">Raw Material Details</h2>
        <p class="sub">{{ viewMaterial()?.usageId }}</p>
        <div class="detail-grid">
          <div class="detail-field"><label>Usage ID</label><div class="value">{{ viewMaterial()?.usageId }}</div></div>
          <div class="detail-field"><label>Batch</label><div class="value">{{ selectedBatch()?.batchNumber }}</div></div>
          <div class="detail-field"><label>Material Name</label><div class="value">{{ viewMaterial()?.materialName }}</div></div>
          <div class="detail-field"><label>Lot Number</label><div class="value">{{ viewMaterial()?.materialLotNumber }}</div></div>
          <div class="detail-field"><label>Quantity Used</label><div class="value">{{ viewMaterial()?.quantityUsed }} {{ viewMaterial()?.unit }}</div></div>
          <div class="detail-field"><label>Status</label><div class="value"><span class="badge" [ngClass]="materialStatusClass(viewMaterial()?.status)">{{ viewMaterial()?.status }}</span></div></div>
        </div>
      </div>
    </div>

    <!-- 3d. EDIT RAW MATERIAL MODAL -->
    <div class="modal-overlay" *ngIf="showEditMaterialModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeWithConfirm(showEditMaterialModal)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 class="with-sub">Edit Raw Material</h2>
        <p class="sub">Update the raw-material usage record</p>
        <form (ngSubmit)="handleUpdateMaterial()">
          <div class="form-grid">
            <div class="field">
              <label>Usage ID</label>
              <input type="text" name="emId" [value]="editMaterialForm.usageId" disabled>
            </div>
            <div class="field">
              <label>Status <span class="req">*</span></label>
              <select name="emStatus" [(ngModel)]="editMaterialForm.status" required>
                <option value="Consumed">Consumed</option>
                <option value="Quarantined">Quarantined</option>
                <option value="Verified">Verified</option>
              </select>
            </div>
            <div class="field full">
              <label>Material Name <span class="req">*</span></label>
              <input type="text" name="emName" [(ngModel)]="editMaterialForm.materialName" required>
            </div>
            <div class="field">
              <label>Lot Number <span class="req">*</span></label>
              <input type="text" name="emLot" [(ngModel)]="editMaterialForm.materialLotNumber" required>
            </div>
            <div class="field">
              <label>Quantity Used <span class="req">*</span></label>
              <input type="number" step="0.01" name="emQty" [(ngModel)]="editMaterialForm.quantityUsed" required>
            </div>
            <div class="field">
              <label>Unit <span class="req">*</span></label>
              <select name="emUnit" [(ngModel)]="editMaterialForm.unit" required>
                <option value="Kg">Kg</option>
                <option value="g">g</option>
                <option value="Litres">Litres</option>
                <option value="mL">mL</option>
                <option value="Units">Units</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Save</button>
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

    /* Detail title row — batch number left, status badge at the far right */
    .bmqc .detail-title-row { align-items: center; }
    .bmqc .status-lg { font-size: 13.5px; padding: 8px 16px; }

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

    /* Summary-bar action icons (send + QC review dropdown) */
    .detail-actions { display: flex; align-items: center; gap: 10px; }
    .icon-action {
      width: 44px; height: 44px; border-radius: var(--radius-md);
      border: 1px solid var(--border); background: var(--card);
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--text-dim); cursor: pointer;
    }
    .icon-action:hover { background: #faf6f0; color: var(--text); }
    .icon-action:disabled { opacity: .4; cursor: not-allowed; }
    .icon-action:disabled:hover { background: var(--card); color: var(--text-dim); }
    .send-icon { background: var(--accent); color: #fff; border-color: var(--accent); }
    .send-icon:hover { background: var(--accent-dark); color: #fff; }
    .send-icon:disabled { opacity: .4; cursor: not-allowed; }
    .send-icon:disabled:hover { background: var(--accent); }
    .review-filter { position: relative; }
    .review-menu {
      position: absolute; right: 0; top: 52px; z-index: 30; min-width: 160px;
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 24px 60px rgba(40,20,8,.28); padding: 6px; display: none;
    }
    .review-menu.open { display: block; }
    .review-menu button {
      width: 100%; text-align: left; background: none; border: none;
      padding: 10px 12px; border-radius: 8px; font-size: 14px; cursor: pointer;
      color: var(--text); font-family: inherit;
    }
    .review-menu button:hover { background: var(--accent-light); color: var(--accent-dark); }

    /* Detail tabs — underline style (no box on hover/active) */
    .detail-tabs { display: flex; gap: 26px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    .detail-tabs button {
      background: none; border: none; padding: 10px 2px; margin-bottom: -1px;
      font-size: 14.5px; font-weight: 600; color: var(--text-dim); cursor: pointer;
      font-family: inherit; border-bottom: 2px solid transparent;
      transition: color .15s ease, border-color .15s ease;
    }
    .detail-tabs button:hover { color: var(--accent); border-bottom-color: var(--accent); background: none; }
    .detail-tabs button.active { color: var(--accent); border-bottom-color: var(--accent); }

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

    /* ============================================================
       Batch Manufacturing & QC — redesigned list view (scoped)
       Mirrors the reference mock-up. Only affects this component.
       ============================================================ */
    :host {
      --st-green-bg:#E4F3E9; --st-green-tx:#2F7D46;
      --st-amber-bg:#FCEEDD; --st-amber-tx:#B4610E;
      --st-blue-bg:#E3F0FB;  --st-blue-tx:#2C6FA6;
      --st-red-bg:#FBE6E4;   --st-red-tx:#C0392B;
      --st-purple-bg:#F0E9F5; --st-purple-tx:#7A4F9E;
      --st-gray-bg:#EEE9E2;  --st-gray-tx:#6b6156;
      --bmqc-radius:16px;
      --bmqc-shadow:0 10px 30px rgba(60,35,15,.08);
    }

    /* Detail-view section header (QC Tests / Raw Materials) */
    .bmqc .section-bar { display: flex; align-items: center; margin: 4px 0 14px; }
    .bmqc .section-bar h3 { margin: 0; font-size: 21px; font-weight: 800; }
    .bmqc .section-spacer { flex: 1; }
    .bmqc .section-bar .btn-create { gap: 4px; }

    /* Page head */
    .bmqc .page-head { align-items: flex-start; }
    .bmqc .page-title { font-size: 30px; letter-spacing: -.01em; }
    .bmqc .page-sub { font-size: 14.5px; }

    /* + Batch button tooltip */
    .bmqc .tip { position: relative; display: inline-flex; }
    .bmqc .tip::after {
      content: attr(data-tip);
      position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%);
      background: #2b1a10; color: #fff; font-size: 12px; font-weight: 500;
      padding: 6px 10px; border-radius: 8px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 40;
    }
    .bmqc .tip::before {
      content: ""; position: absolute; top: calc(100% + 4px); left: 50%;
      transform: translateX(-50%); border: 6px solid transparent;
      border-bottom-color: #2b1a10; opacity: 0; transition: opacity .15s; z-index: 40;
    }
    .bmqc .tip:hover::after, .bmqc .tip:hover::before { opacity: 1; }
    .bmqc .btn-primary { padding: 12px 20px; border-radius: 12px; }
    .bmqc .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

    /* Stat cards */
    .bmqc .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 26px; }
    .bmqc .stat {
      background: var(--card); border: 1px solid var(--border); border-radius: var(--bmqc-radius);
      padding: 22px 24px; box-shadow: var(--bmqc-shadow);
    }
    .bmqc .stat-row { display: flex; align-items: flex-start; justify-content: space-between; }
    .bmqc .stat-label { color: var(--text-dim); font-size: 14px; }
    .bmqc .stat-ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
    .bmqc .stat-num { font-size: 40px; font-weight: 800; margin-top: 22px; letter-spacing: -.02em; font-family: 'Manrope', sans-serif; }
    .bmqc .ic-amber { background: var(--st-amber-bg); color: var(--st-amber-tx); }
    .bmqc .ic-blue  { background: var(--st-blue-bg);  color: var(--st-blue-tx); }
    .bmqc .ic-green { background: var(--st-green-bg); color: var(--st-green-tx); }
    .bmqc .ic-red   { background: var(--st-red-bg);   color: var(--st-red-tx); }
    .bmqc .tx-amber { color: var(--st-amber-tx); }
    .bmqc .tx-green { color: var(--st-green-tx); }
    .bmqc .tx-red   { color: var(--st-red-tx); }

    /* Toolbar */
    .bmqc .toolbar { display: flex; gap: 16px; margin-bottom: 22px; }
    .bmqc .search {
      flex: 1; display: flex; align-items: center; gap: 10px;
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      padding: 0 16px; height: 52px; color: var(--text-dim);
    }
    .bmqc .search input { border: none; outline: none; background: transparent; font-size: 15px; width: 100%; font-family: inherit; color: var(--text); }
    .bmqc select.filter {
      height: 52px; min-width: 220px; border: 1px solid var(--border); border-radius: 12px;
      background: var(--card); padding: 0 16px; font-size: 15px; color: var(--text);
      font-family: inherit; cursor: pointer;
    }
    .bmqc select.filter:focus { outline: none; border-color: var(--accent); }

    /* Table card */
    .bmqc .card-block {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--bmqc-radius); box-shadow: var(--bmqc-shadow); overflow: visible;
    }
    .bmqc .block-head { display: flex; align-items: center; gap: 12px; padding: 22px 26px 6px; }
    .bmqc .block-head h3 { margin: 0; font-size: 20px; font-weight: 800; }
    .bmqc .block-head .count { color: var(--text-dim); font-weight: 500; font-size: 14px; }
    .bmqc .block-spacer { flex: 1; }

    /* Export button + menu */
    .bmqc .export-wrap { position: relative; }
    .bmqc .btn-ghost {
      background: var(--card); color: var(--text); border: 1px solid var(--border);
      border-radius: 12px; padding: 10px 16px; font-weight: 600; font-size: 14px;
      display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-family: inherit;
    }
    .bmqc .btn-ghost:hover { background: #faf6f0; }
    .bmqc .export-menu {
      position: absolute; right: 0; top: 48px; z-index: 30; min-width: 190px;
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 24px 60px rgba(40,20,8,.28); padding: 6px; display: none;
    }
    .bmqc .export-menu.open { display: block; }
    .bmqc .export-menu button {
      width: 100%; display: flex; align-items: center; gap: 10px; background: none; border: none;
      padding: 10px 12px; border-radius: 8px; font-size: 14px; cursor: pointer; color: var(--text);
      font-family: inherit; text-align: left;
    }
    .bmqc .export-menu button:hover { background: var(--accent-light); color: var(--accent-dark); }

    /* Table */
    .bmqc table.bmqc-table { width: 100%; border-collapse: collapse; }
    .bmqc .bmqc-table thead th {
      text-align: left; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase;
      color: var(--text-dim); font-weight: 600; padding: 16px 26px; border-bottom: 1px solid var(--border);
    }
    .bmqc .bmqc-table tbody td { padding: 18px 26px; border-bottom: 1px solid var(--border); font-size: 14.5px; vertical-align: middle; }
    .bmqc .bmqc-table tbody tr:last-child td { border-bottom: none; }
    .bmqc .bmqc-table tbody tr:hover { background: #faf6f0; }
    .bmqc .bmqc-table th.right, .bmqc .bmqc-table td.right { text-align: right; }
    .bmqc .cell-title b { display: block; font-size: 15px; }
    .bmqc .cell-title small { color: var(--text-dim); font-size: 12.5px; letter-spacing: .03em; }
    .bmqc .name-cell { font-weight: 700; }

    /* Badges (status colours matched to the mock-up) — available across list, detail & modals */
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600; }
    .b-green  { background: var(--st-green-bg);  color: var(--st-green-tx); }
    .b-amber  { background: var(--st-amber-bg);  color: var(--st-amber-tx); }
    .b-blue   { background: var(--st-blue-bg);   color: var(--st-blue-tx); }
    .b-red    { background: var(--st-red-bg);    color: var(--st-red-tx); }
    .b-purple { background: var(--st-purple-bg); color: var(--st-purple-tx); }
    .b-gray   { background: var(--st-gray-bg);   color: var(--st-gray-tx); }

    /* Row action menu */
    .bmqc .row-actions { position: relative; display: inline-flex; }
    .bmqc .icon-menu-btn {
      width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border);
      background: var(--card); display: grid; place-items: center; cursor: pointer; color: var(--text-dim);
    }
    .bmqc .icon-menu-btn:hover { background: #faf6f0; color: var(--text); }
    .bmqc .row-menu {
      position: absolute; right: 0; top: 46px; z-index: 20;
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 24px 60px rgba(40,20,8,.28); min-width: 158px; padding: 6px; display: none;
    }
    .bmqc .row-actions:hover .row-menu, .bmqc .row-actions:focus-within .row-menu { display: block; }
    .bmqc .row-menu .dropdown-item:hover { background: var(--accent-light); color: var(--accent-dark); }

    /* Pagination footer */
    .bmqc .table-footer { padding: 16px 26px; }

    /* #1 — tighter gap between the + icon and "Batch" */
    .bmqc .btn-create { gap: 4px; }

    /* #2 — icon-only status filter with click-to-open menu */
    .bmqc .status-filter { position: relative; }
    .bmqc .status-trigger {
      height: 52px; padding: 0 14px; display: inline-flex; align-items: center; gap: 4px;
      border: 1px solid var(--border); border-radius: 12px; background: var(--card);
      color: var(--text-dim); cursor: pointer;
    }
    .bmqc .status-trigger:hover { background: #faf6f0; color: var(--text); }
    .bmqc .status-trigger.filtered { border-color: var(--accent); color: var(--accent); }
    .bmqc .status-menu {
      position: absolute; right: 0; top: 58px; z-index: 30; min-width: 190px;
      background: var(--card); border: 1px solid var(--border); border-radius: 12px;
      box-shadow: 0 24px 60px rgba(40,20,8,.28); padding: 6px; display: none;
    }
    .bmqc .status-menu.open { display: block; }
    .bmqc .status-menu button {
      width: 100%; text-align: left; background: none; border: none;
      padding: 10px 12px; border-radius: 8px; font-size: 14px; cursor: pointer;
      color: var(--text); font-family: inherit;
    }
    .bmqc .status-menu button:hover { background: var(--accent-light); color: var(--accent-dark); }
    .bmqc .status-menu button.active { background: var(--accent-light); color: var(--accent-dark); font-weight: 700; }

    /* #4 — numbered pagination buttons */
    .bmqc .pager .page-num { width: auto; min-width: 30px; height: 30px; padding: 0 8px; font-size: 13.5px; font-weight: 600; }
    .bmqc .pager .page-num.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* #3 — Create/Edit modal subtitle under the title */
    .modal h2.with-sub { margin-bottom: 6px; }
    .modal .sub { margin: 0 0 24px; color: var(--text-dim); font-size: 14px; }

    @media (max-width: 1080px) {
      .bmqc .stats { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class BatchesComponent implements OnInit {
  private apiService = inject(ApiService);
  private auth = inject(AuthService);

  // Role-based create permissions:
  //  - Manufacturing Supervisor may create batches (not QC/materials)
  //  - QA Analyst may create QC tests & raw materials (not batches)
  canCreateBatch(): boolean {
    const r = this.auth.role();
    return r === 'ManufacturingSupervisor' || r === 'Manufacturing Supervisor';
  }
  canCreateQcMaterial(): boolean {
    const r = this.auth.role();
    return r === 'QAAnalyst' || r === 'QA Analyst';
  }

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

  // Detail-view pagination (QC tests + raw materials)
  qcPage = signal<number>(1);
  materialPage = signal<number>(1);
  detailPageSize = 3;

  // Mouse-swipe (left→right) back-navigation
  private swipeStartX = 0;
  private swipeStartY = 0;

  // List filtering
  searchTerm = signal<string>('');
  statusFilter = signal<string>('');

  // Export dropdown
  exportMenuOpen = signal<boolean>(false);

  // Status filter dropdown
  statusMenuOpen = signal<boolean>(false);

  // QC review dropdown (detail view)
  reviewMenuOpen = signal<boolean>(false);

  // Modals Visibility
  showCreateBatchModal = signal<boolean>(false);
  showEditBatchModal = signal<boolean>(false);
  showAddQcModal = signal<boolean>(false);
  showAddMaterialModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // Edit batch form
  editBatchForm = {
    batchId: null as any,
    batchNumber: '',
    productId: null as any,
    manufacturingDate: '',
    expiryDate: '',
    quantityManufactured: 0,
    unit: 'Vials',
    manufacturingSiteId: null as any,
    status: 'InProgress'
  };

  // QC test view/edit
  showViewQcModal = signal<boolean>(false);
  viewQc = signal<any>(null);
  showEditQcModal = signal<boolean>(false);
  editQcForm = {
    testId: '',
    testType: 'Assay',
    testedByName: '',
    testDate: '',
    result: '',
    specification: '',
    status: 'Pass'
  };

  // Raw material view/edit
  showViewMaterialModal = signal<boolean>(false);
  viewMaterial = signal<any>(null);
  showEditMaterialModal = signal<boolean>(false);
  editMaterialForm = {
    usageId: '',
    materialName: '',
    materialLotNumber: '',
    quantityUsed: 0,
    unit: 'Kg',
    status: 'Consumed'
  };

  // Form Models
  createBatchForm = {
    batchNumber: '',
    lotNumber: '',
    productId: null as any,
    manufacturingDate: '',
    expiryDate: '',
    quantityManufactured: 500,
    unit: 'Tablets',
    manufacturingSiteId: null as any,
    status: 'InProgress'
  };

  addQcForm = {
    testType: 'Assay',
    testedById: 1,
    testedByName: 'Arjun Rao',
    testDate: '',
    result: '',
    specification: '',
    status: 'Pass'
  };

  addMaterialForm = {
    materialName: '',
    materialLotNumber: '',
    quantityUsed: null as any,
    unit: 'Kg',
    status: 'Consumed'
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
      next: (data) => this.batches.set(data || []),
      error: (err) => this.showError(err.error?.message || 'Error fetching batch records register.')
    });
  }

  // ---------------------------------------------------------------------------
  // NO-BACKEND FALLBACK (UI/design preview only). Populates representative rows
  // so the redesigned screen can be reviewed while the microservices are down.
  // Remove this method (and its calls) once the backend is available.
  // ---------------------------------------------------------------------------
  private loadSampleData() {
    if (!this.products().length) {
      this.products.set([
        { productId: 1, productName: 'Oncozin 50mg' },
        { productId: 2, productName: 'Cardiofex 10mg' },
        { productId: 3, productName: 'Glucovant XR' },
        { productId: 4, productName: 'PediaDose Syrup' }
      ]);
    }
    if (!this.sites().length) {
      this.sites.set([
        { siteId: 1, siteName: 'Site 1 — Pune' },
        { siteId: 2, siteName: 'Site 2 — Hyderabad' },
        { siteId: 3, siteName: 'Site 3 — Basel' }
      ]);
    }
    this.batches.set([
      { batchId: 1, batchNumber: 'BATCH-2026-231', productId: 1, supervisorName: 'Meera Nair', status: 'Released', quantityManufactured: 30000, unit: 'Tablets', manufacturingDate: '2026-06-22', expiryDate: '2027-06-22', releaseDate: '2026-07-21', manufacturingSiteId: 2 },
      { batchId: 2, batchNumber: 'BATCH-2026-229', productId: 2, supervisorName: 'Meera Nair', status: 'InProgress', quantityManufactured: 18000, unit: 'Tablets', manufacturingDate: '2026-07-01', expiryDate: '2027-07-01', releaseDate: '2026-07-27', manufacturingSiteId: 1 },
      { batchId: 3, batchNumber: 'BATCH-2026-224', productId: 3, supervisorName: 'Meera Nair', status: 'QCHold', quantityManufactured: 24000, unit: 'Capsules', manufacturingDate: '2026-06-15', expiryDate: '2027-06-15', releaseDate: '2026-07-19', manufacturingSiteId: 3 },
      { batchId: 4, batchNumber: 'BATCH-2026-218', productId: 4, supervisorName: 'Rahul Verma', status: 'Rejected', quantityManufactured: 12000, unit: 'Litres', manufacturingDate: '2026-06-05', expiryDate: '2027-06-05', releaseDate: '2026-07-12', manufacturingSiteId: 1 },
      { batchId: 5, batchNumber: 'BATCH-2026-215', productId: 1, supervisorName: 'Anil Kapoor', status: 'Released', quantityManufactured: 26000, unit: 'Tablets', manufacturingDate: '2026-05-28', expiryDate: '2027-05-28', releaseDate: '2026-07-08', manufacturingSiteId: 2 },
      { batchId: 6, batchNumber: 'BATCH-2026-210', productId: 2, supervisorName: 'Meera Nair', status: 'InProgress', quantityManufactured: 15000, unit: 'Tablets', manufacturingDate: '2026-07-05', expiryDate: '2027-07-05', releaseDate: '', manufacturingSiteId: 1 },
      { batchId: 7, batchNumber: 'BATCH-2026-207', productId: 3, supervisorName: 'Rahul Verma', status: 'QCHold', quantityManufactured: 20000, unit: 'Capsules', manufacturingDate: '2026-06-11', expiryDate: '2027-06-11', releaseDate: '', manufacturingSiteId: 3 },
      { batchId: 8, batchNumber: 'BATCH-2026-203', productId: 4, supervisorName: 'Anil Kapoor', status: 'Recalled', quantityManufactured: 9000, unit: 'Litres', manufacturingDate: '2026-05-20', expiryDate: '2027-05-20', releaseDate: '2026-06-30', manufacturingSiteId: 1 },
      { batchId: 9, batchNumber: 'BATCH-2026-198', productId: 1, supervisorName: 'Meera Nair', status: 'Released', quantityManufactured: 32000, unit: 'Tablets', manufacturingDate: '2026-05-12', expiryDate: '2027-05-12', releaseDate: '2026-06-22', manufacturingSiteId: 2 },
      { batchId: 10, batchNumber: 'BATCH-2026-192', productId: 2, supervisorName: 'Rahul Verma', status: 'Rejected', quantityManufactured: 11000, unit: 'Tablets', manufacturingDate: '2026-05-03', expiryDate: '2027-05-03', releaseDate: '2026-06-15', manufacturingSiteId: 1 }
    ]);
  }

  // ---- List filtering / stats ----
  private matchesStatus(status: string, filter: string): boolean {
    if (filter === 'InProgress') return status === 'InProgress' || status === 'InProcess';
    if (filter === 'QCHold') return status === 'QCHold' || status === 'QCH';
    if (filter === 'Released') return status === 'Released' || status === 'REL';
    return status === filter;
  }

  filteredBatches() {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.batches().filter(b => {
      const statusOk = !status || this.matchesStatus(b.status, status);
      if (!statusOk) return false;
      if (!term) return true;
      const haystack = [
        b.batchNumber,
        this.getProductName(b.productId),
        this.getSiteName(b.manufacturingSiteId),
        this.getSupervisor(b),
        b.status
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBatches().length / this.pageSize));
  }

  inProductionCount(): number {
    return this.batches().filter(b => b.status === 'InProgress' || b.status === 'InProcess').length;
  }

  qcPassedCount(): number {
    return this.batches().filter(b => b.status === 'Released' || b.status === 'REL').length;
  }

  qcFailedCount(): number {
    return this.batches().filter(b => b.status === 'Rejected').length;
  }

  getSupervisor(batch: any): string {
    return batch.supervisorName || batch.supervisor || batch.createdByName || '—';
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Released':
      case 'REL': return 'b-green';
      case 'InProgress':
      case 'InProcess': return 'b-amber';
      case 'QCHold':
      case 'QCH': return 'b-blue';
      case 'Rejected': return 'b-red';
      case 'Recalled': return 'b-gray';
      default: return 'b-gray';
    }
  }

  onSearch(e: Event) {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.page.set(1);
  }

  toggleStatusMenu(e: Event) {
    e.stopPropagation();
    this.exportMenuOpen.set(false);
    this.statusMenuOpen.update(v => !v);
  }

  selectStatus(value: string) {
    this.statusFilter.set(value);
    this.statusMenuOpen.set(false);
    this.page.set(1);
  }

  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  // ---- Detail-view pagination ----
  paginatedQcTests() {
    const start = (this.qcPage() - 1) * this.detailPageSize;
    return this.qcTests().slice(start, start + this.detailPageSize);
  }
  qcTotalPages(): number {
    return Math.max(1, Math.ceil(this.qcTests().length / this.detailPageSize));
  }
  qcPages(): number[] {
    return Array.from({ length: this.qcTotalPages() }, (_, i) => i + 1);
  }

  paginatedRawMaterials() {
    const start = (this.materialPage() - 1) * this.detailPageSize;
    return this.rawMaterials().slice(start, start + this.detailPageSize);
  }
  materialTotalPages(): number {
    return Math.max(1, Math.ceil(this.rawMaterials().length / this.detailPageSize));
  }
  materialPages(): number[] {
    return Array.from({ length: this.materialTotalPages() }, (_, i) => i + 1);
  }

  toggleExportMenu(e: Event) {
    e.stopPropagation();
    this.statusMenuOpen.set(false);
    this.exportMenuOpen.update(v => !v);
  }

  // Close open dropdowns when clicking anywhere outside their triggers
  @HostListener('document:click')
  closeMenus() {
    this.exportMenuOpen.set(false);
    this.statusMenuOpen.set(false);
    this.reviewMenuOpen.set(false);
  }

  // Mouse swipe left→right anywhere on the detail view goes back to the list.
  onSwipeStart(e: PointerEvent) {
    this.swipeStartX = e.clientX;
    this.swipeStartY = e.clientY;
  }

  onSwipeEnd(e: PointerEvent) {
    const dx = e.clientX - this.swipeStartX;
    const dy = Math.abs(e.clientY - this.swipeStartY);
    if (dx > 120 && dy < 80) {
      this.selectedBatch.set(null);
    }
  }

  isQcHold(): boolean {
    const s = this.selectedBatch()?.status;
    return s === 'QCHold' || s === 'QCH';
  }

  sendToQc() {
    if (this.selectedBatch()?.status === 'InProgress') {
      this.transitionStateDirect('QCHold');
    }
  }

  toggleReviewMenu(e: Event) {
    e.stopPropagation();
    this.reviewMenuOpen.update(v => !v);
  }

  chooseReview(value: string) {
    this.reviewMenuOpen.set(false);
    if (value === 'Released') {
      this.openSignatureModal('Released');
    } else {
      this.transitionStateDirect(value);
    }
  }

  exportData(type: 'pdf' | 'excel') {
    this.exportMenuOpen.set(false);
    const rows = this.filteredBatches().map(b => ({
      Batch: b.batchNumber,
      Product: this.getProductName(b.productId),
      Supervisor: this.getSupervisor(b),
      Status: b.status,
      'Release Date': b.releaseDate || b.expiryDate || ''
    }));

    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Batches');
      XLSX.writeFile(wb, 'PharmaTrack_Batches.xlsx');
      this.showSuccess('Batches exported to Excel successfully.');
    } else {
      const doc = new jsPDF();
      doc.text('PharmaTrack — Batch Manufacturing & QC', 14, 15);
      autoTable(doc, {
        head: [['Batch', 'Product', 'Supervisor', 'Status', 'Release Date']],
        body: rows.map(r => [r.Batch, r.Product, r.Supervisor, r.Status, r['Release Date']]),
        startY: 22,
        theme: 'striped',
        headStyles: { fillColor: [206, 82, 0] }
      });
      doc.save('PharmaTrack_Batches.pdf');
      this.showSuccess('Batches exported to PDF successfully.');
    }
  }

  openEditBatchModal(batch: any) {
    this.editBatchForm = {
      batchId: batch.batchId,
      batchNumber: batch.batchNumber,
      productId: batch.productId,
      manufacturingDate: batch.manufacturingDate,
      expiryDate: batch.expiryDate,
      quantityManufactured: batch.quantityManufactured,
      unit: batch.unit,
      manufacturingSiteId: batch.manufacturingSiteId,
      status: batch.status
    };
    this.showEditBatchModal.set(true);
    this.clearMessages();
  }

  handleUpdateBatch() {
    const payload = {
      ...this.editBatchForm,
      productId: parseInt(this.editBatchForm.productId, 10),
      manufacturingSiteId: parseInt(this.editBatchForm.manufacturingSiteId, 10)
    };

    this.apiService.updateBatch(this.editBatchForm.batchId, payload).subscribe({
      next: () => {
        this.showSuccess('Batch record updated successfully.');
        this.showEditBatchModal.set(false);
        this.fetchBatches();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to update batch record.')
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
    return this.filteredBatches().slice(start, start + this.pageSize);
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
    this.qcPage.set(1);
    this.materialPage.set(1);
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

  // ---- Detail-view helpers ----
  isReleased(): boolean {
    const s = this.selectedBatch()?.status;
    return s === 'Released' || s === 'REL';
  }

  getTestedBy(t: any): string {
    if (!t) return '';
    return t.testedByName || t.testedBy || (t.testedById ? `Staff #${t.testedById}` : '—');
  }

  qcStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'PASS': return 'b-green';
      case 'FAIL': return 'b-red';
      case 'RETEST': return 'b-amber';
      case 'PENDING': return 'b-blue';
      default: return 'b-gray';
    }
  }

  materialStatusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'consumed': return 'b-green';
      case 'quarantined': return 'b-purple';
      case 'verified': return 'b-blue';
      default: return 'b-gray';
    }
  }

  openViewQc(t: any) {
    this.viewQc.set(t);
    this.showViewQcModal.set(true);
  }

  openEditQc(t: any) {
    this.editQcForm = {
      testId: t.testId,
      testType: t.testType || 'Assay',
      testedByName: this.getTestedBy(t),
      testDate: t.testDate || '',
      result: t.result || '',
      specification: t.specification || '',
      status: t.status || 'Pass'
    };
    this.showEditQcModal.set(true);
    this.clearMessages();
  }

  // No backend update endpoint for QC tests — update the loaded list locally.
  handleUpdateQc() {
    this.qcTests.update(list =>
      list.map(t => t.testId === this.editQcForm.testId
        ? { ...t, ...this.editQcForm, testedByName: this.editQcForm.testedByName }
        : t)
    );
    this.showEditQcModal.set(false);
    this.showSuccess('QC test updated.');
  }

  openViewMaterial(m: any) {
    this.viewMaterial.set(m);
    this.showViewMaterialModal.set(true);
  }

  openEditMaterial(m: any) {
    this.editMaterialForm = {
      usageId: m.usageId,
      materialName: m.materialName || '',
      materialLotNumber: m.materialLotNumber || '',
      quantityUsed: m.quantityUsed || 0,
      unit: m.unit || 'Kg',
      status: m.status || 'Consumed'
    };
    this.showEditMaterialModal.set(true);
    this.clearMessages();
  }

  // No backend update endpoint for raw materials — update the loaded list locally.
  handleUpdateMaterial() {
    this.rawMaterials.update(list =>
      list.map(m => m.usageId === this.editMaterialForm.usageId
        ? { ...m, ...this.editMaterialForm }
        : m)
    );
    this.showEditMaterialModal.set(false);
    this.showSuccess('Raw material updated.');
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
    this.createBatchForm = {
      batchNumber: '',
      lotNumber: '',
      productId: this.products()[0]?.productId || null,
      manufacturingDate: new Date().toISOString().substring(0, 10),
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      quantityManufactured: 2500,
      unit: 'Tablets',
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
      testType: 'Assay',
      testedById: Number(localStorage.getItem('pt_userId')) || 1,
      testedByName: 'Arjun Rao',
      testDate: new Date().toISOString().substring(0, 10),
      result: '',
      specification: '',
      status: 'Pass'
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
      materialName: '',
      materialLotNumber: '',
      quantityUsed: null as any,
      unit: 'Kg',
      status: 'Consumed'
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
