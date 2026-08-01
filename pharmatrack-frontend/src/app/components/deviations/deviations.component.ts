import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-deviations-capa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="deviations-page">

      <!-- ============ MASTER VIEW: Deviations list ============ -->
      <div *ngIf="!selectedDeviation()" class="dvc">
        <div class="page-head">
          <div>
            <h2 class="page-title">Deviation &amp; CAPA Management</h2>
            <p class="page-sub">Quality deviations, root cause analysis, and corrective action plans</p>
          </div>
          <span class="tip" [attr.data-tip]="canManage() ? 'Create Log' : 'Only a QA Analyst can log deviations'">
            <button class="btn btn-primary btn-create" (click)="openCreateDeviationModal()" [disabled]="!canManage()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Log
            </button>
          </span>
        </div>

        <!-- Stat cards -->
        <div class="stats">
          <div class="stat">
            <div class="stat-row">
              <span class="stat-label">Total Deviations</span>
              <span class="stat-ic ic-amber"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg></span>
            </div>
            <div class="stat-num">{{ deviations().length }}</div>
          </div>
          <div class="stat">
            <div class="stat-row">
              <span class="stat-label">Open</span>
              <span class="stat-ic ic-red"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg></span>
            </div>
            <div class="stat-num tx-red">{{ openCount() }}</div>
          </div>
          <div class="stat">
            <div class="stat-row">
              <span class="stat-label">Under Investigation</span>
              <span class="stat-ic ic-blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg></span>
            </div>
            <div class="stat-num tx-blue">{{ underInvestigationCount() }}</div>
          </div>
          <div class="stat">
            <div class="stat-row">
              <span class="stat-label">Closed</span>
              <span class="stat-ic ic-green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><polyline points="22 4 12 14.1 9 11.1"/></svg></span>
            </div>
            <div class="stat-num tx-green">{{ closedCount() }}</div>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.7" y2="16.7"/></svg>
            <input type="text" placeholder="Search deviations, entities, owners…" [value]="searchTerm()" (input)="onSearch($event)">
          </div>
          <div class="status-filter">
            <button type="button" class="status-trigger" [class.filtered]="statusFilter()" (click)="toggleStatusMenu($event)" aria-label="Filter by status" title="Filter by status">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="status-menu" [class.open]="statusMenuOpen()">
              <button type="button" [class.active]="statusFilter() === ''" (click)="selectStatus('')">All statuses</button>
              <button type="button" [class.active]="statusFilter() === 'Open'" (click)="selectStatus('Open')">Open</button>
              <button type="button" [class.active]="statusFilter() === 'Under Investigation'" (click)="selectStatus('Under Investigation')">Under Investigation</button>
              <button type="button" [class.active]="statusFilter() === 'CAPA Created'" (click)="selectStatus('CAPA Created')">CAPA Created</button>
              <button type="button" [class.active]="statusFilter() === 'Closed'" (click)="selectStatus('Closed')">Closed</button>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div class="card-block">
          <div class="block-head">
            <h3>Deviation Log</h3>
            <span class="count">· {{ filteredDeviations().length }} total</span>
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
          <table class="dvc-table">
            <thead>
              <tr>
                <th>Deviation</th>
                <th>Related Entity</th>
                <th>Detected By</th>
                <th>Impact</th>
                <th>Status</th>
                <th>Detection Date</th>
                <th class="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let dev of paginatedDeviations()">
                <td class="cell-title">
                  <b>{{ dev.description }}</b>
                </td>
                <td>
                  <span class="tooltip">
                    {{ entityLabel(dev.relatedEntityType) }}
                    <span class="tooltiptext">{{ dev.relatedEntityId }}</span>
                  </span>
                </td>
                <td>{{ getDetectedBy(dev) }}</td>
                <td>
                  <span class="tooltip impact-icon">
                    <span *ngIf="dev.impact === 'Minor'" class="impact-minor">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>
                    </span>
                    <span *ngIf="dev.impact === 'Major'" class="impact-major">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
                    </span>
                    <span *ngIf="dev.impact === 'Critical'" class="impact-critical">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                    </span>
                    <span class="tooltiptext">{{ dev.impact }}</span>
                  </span>
                </td>
                <td><span class="badge" [ngClass]="statusClass(dev.status)">{{ dev.status }}</span></td>
                <td>{{ dev.detectionDate ? (dev.detectionDate | date:'mediumDate') : '—' }}</td>
                <td class="right">
                  <div class="row-actions">
                    <button type="button" class="icon-menu-btn" aria-label="Row actions">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    <div class="row-menu">
                      <button type="button" class="dropdown-item" (click)="viewDeviationDetails(dev)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                      <button type="button" class="dropdown-item" *ngIf="canManage()" (click)="openEditDeviation(dev)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                        Edit
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredDeviations().length === 0">
                <td colspan="7" class="empty-state">No deviations logged.</td>
              </tr>
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="table-footer" *ngIf="filteredDeviations().length > 0">
            <span>Showing {{ paginatedDeviations().length }} of {{ filteredDeviations().length }} &middot; Page {{ page() }} of {{ totalPages() }}</span>
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

      <!-- ============ DETAIL VIEW ============ -->
      <div *ngIf="selectedDeviation()" class="dvc">
        <div class="breadcrumb">
          <span class="crumb-link" (click)="selectedDeviation.set(null)">Deviations</span> / <b>{{ selectedDeviation().deviationId }}</b>
        </div>

        <div class="page-head detail-title-row">
          <div>
            <h2 class="page-title">{{ selectedDeviation().deviationId }}</h2>
            <p class="page-sub">Root cause analysis and corrective &amp; preventive action plans.</p>
          </div>
          <span class="badge status-lg" [ngClass]="statusClass(selectedDeviation().status)">{{ selectedDeviation().status }}</span>
        </div>

        <!-- Summary bar + workflow send -->
        <div class="detail-summary">
          <div class="sum-item">
            <div class="sum-k">Impact</div>
            <div class="sum-v">
              <span class="tooltip impact-icon">
                <span *ngIf="selectedDeviation().impact === 'Minor'" class="impact-minor">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l2.5 2.5L16 9"/></svg>
                </span>
                <span *ngIf="selectedDeviation().impact === 'Major'" class="impact-major">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
                </span>
                <span *ngIf="selectedDeviation().impact === 'Critical'" class="impact-critical">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12" y2="16"/></svg>
                </span>
                <span class="tooltiptext">{{ selectedDeviation().impact }}</span>
              </span>
            </div>
          </div>
          <div class="sum-item">
            <div class="sum-k">Related Entity</div>
            <div class="sum-v">
              <span class="tooltip">
                {{ entityLabel(selectedDeviation().relatedEntityType) }}
                <span class="tooltiptext">{{ selectedDeviation().relatedEntityId }}</span>
              </span>
            </div>
          </div>
          <div class="sum-item"><div class="sum-k">Detection Date</div><div class="sum-v">{{ selectedDeviation().detectionDate ? (selectedDeviation().detectionDate | date:'mediumDate') : '—' }}</div></div>
          <div class="sum-item"><div class="sum-k">Detected By</div><div class="sum-v">{{ getDetectedBy(selectedDeviation()) }}</div></div>

          <div class="sum-spacer"></div>

          <div class="detail-actions">
            <!-- Status dropdown (left of send): visible once investigation started -->
            <div class="review-filter" *ngIf="showDevReview()">
              <button type="button" class="icon-action" [disabled]="!canManage()" (click)="toggleDevReviewMenu($event)" aria-label="Change status" [title]="canManage() ? 'Change status' : 'Only a QA Analyst can change status'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="review-menu" [class.open]="devReviewMenuOpen()">
                <button type="button" (click)="chooseDevReview('CAPA Created')">CAPA Created</button>
                <button type="button" (click)="chooseDevReview('Closed')">Closed</button>
              </div>
            </div>

            <!-- Send icon (Open → Under Investigation) -->
            <span class="tip" [attr.data-tip]="canManage() ? 'Start Investigation' : 'Only a QA Analyst can start investigation'">
              <button type="button" class="icon-action send-icon" [disabled]="!canManage() || selectedDeviation().status !== 'Open'" (click)="startInvestigation()" aria-label="Start Investigation">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </span>
          </div>
        </div>

        <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

        <!-- Corrective & Preventive Actions -->
        <div class="section-bar">
          <h3>Corrective &amp; Preventive Actions</h3>
          <div class="section-spacer"></div>
          <span class="tip" [attr.data-tip]="canManage() ? 'Create CAPA' : 'Only a QA Analyst can create CAPA'">
            <button class="btn btn-primary btn-create" (click)="openCreateCapaModal()" [disabled]="!canManage() || selectedDeviation().status === 'Closed'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              CAPA
            </button>
          </span>
        </div>
        <div class="card-block">
          <table class="dvc-table">
            <thead>
              <tr>
                <th>CAPA</th>
                <th>Root Cause</th>
                <th>Assigned To</th>
                <th>Due Date</th>
                <th>Closed Date</th>
                <th>Status</th>
                <th class="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let capa of paginatedCapas()">
                <td class="cell-title"><b>{{ capa.capaId }}</b></td>
                <td>{{ capa.rootCause }}</td>
                <td>{{ getAssignedTo(capa) }}</td>
                <td>{{ capa.dueDate ? (capa.dueDate | date:'mediumDate') : '—' }}</td>
                <td>{{ capa.closedDate ? (capa.closedDate | date:'mediumDate') : '—' }}</td>
                <td><span class="badge" [ngClass]="capaStatusClass(capa.status)">{{ capa.status }}</span></td>
                <td class="right">
                  <div class="row-actions">
                    <button type="button" class="icon-menu-btn" aria-label="Row actions">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    <div class="row-menu">
                      <button type="button" class="dropdown-item" (click)="openViewCapa(capa)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                      <button type="button" class="dropdown-item" *ngIf="canManage()" (click)="openEditCapa(capa)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                        Edit
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="capas().length === 0">
                <td colspan="7" class="empty-state">No CAPA procedures initialized for this deviation.</td>
              </tr>
            </tbody>
          </table>
          <div class="table-footer" *ngIf="capas().length > 0">
            <span>Showing {{ paginatedCapas().length }} of {{ capas().length }} &middot; Page {{ capaPage() }} of {{ capaTotalPages() }}</span>
            <div class="pager">
              <button [disabled]="capaPage() === 1" (click)="capaPage.set(capaPage() - 1)" aria-label="Previous page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button *ngFor="let p of capaPages()" class="page-num" [class.active]="p === capaPage()" (click)="capaPage.set(p)">{{ p }}</button>
              <button [disabled]="capaPage() >= capaTotalPages()" (click)="capaPage.set(capaPage() + 1)" aria-label="Next page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
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
                <label>Detected By <span class="req">*</span></label>
                <input type="number" name="detBy" [(ngModel)]="createDeviationForm.detectedById" placeholder="Staff ID" required>
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
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 1b. VIEW DEVIATION MODAL (read-only) -->
      <div class="modal-overlay dvc" *ngIf="showViewDeviationModal()">
        <div class="modal">
          <button class="modal-close-x" (click)="showViewDeviationModal.set(false)" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2 class="with-sub">Deviation Details</h2>
          <p class="modal-sub">{{ viewDeviation()?.deviationId }}</p>
          <div class="detail-grid">
            <div class="detail-field"><label>Deviation Code</label><div class="value">{{ viewDeviation()?.deviationId }}</div></div>
            <div class="detail-field"><label>Detection Date</label><div class="value">{{ viewDeviation()?.detectionDate ? (viewDeviation()?.detectionDate | date:'mediumDate') : '—' }}</div></div>
            <div class="detail-field"><label>Related Entity</label><div class="value">{{ entityLabel(viewDeviation()?.relatedEntityType) }} · {{ viewDeviation()?.relatedEntityId }}</div></div>
            <div class="detail-field"><label>Detected By</label><div class="value">{{ getDetectedBy(viewDeviation()) }}</div></div>
            <div class="detail-field"><label>Impact</label><div class="value"><span class="badge" [ngClass]="impactClass(viewDeviation()?.impact)">{{ viewDeviation()?.impact }}</span></div></div>
            <div class="detail-field"><label>Status</label><div class="value"><span class="badge" [ngClass]="statusClass(viewDeviation()?.status)">{{ viewDeviation()?.status }}</span></div></div>
            <div class="detail-field" style="grid-column:1 / -1">
              <label>Description</label>
              <p class="description-text">{{ viewDeviation()?.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 1c. EDIT DEVIATION MODAL -->
      <div class="modal-overlay" *ngIf="showEditDeviationModal()">
        <div class="modal">
          <button class="modal-close-x" (click)="confirmDiscard() && showEditDeviationModal.set(false)" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2 class="with-sub">Edit Deviation Log</h2>
          <p class="modal-sub">Update the deviation record</p>
          <form (ngSubmit)="handleUpdateDeviation()">
            <div class="form-grid">
              <div class="field">
                <label>Deviation Code</label>
                <input type="text" name="edId" [value]="editDeviationForm.deviationId" disabled>
              </div>
              <div class="field">
                <label>Related Entity Type <span class="req">*</span></label>
                <select name="edRelType" [(ngModel)]="editDeviationForm.relatedEntityType" required>
                  <option value="BatchRecord">Manufacturing Batch (BatchRecord)</option>
                  <option value="DrugShipment">Supply Shipment (DrugShipment)</option>
                  <option value="TrialProtocol">Clinical Study (TrialProtocol)</option>
                </select>
              </div>
              <div class="field">
                <label>Related Entity ID / Code <span class="req">*</span></label>
                <input type="text" name="edRelId" [(ngModel)]="editDeviationForm.relatedEntityId" required>
              </div>
              <div class="field">
                <label>Impact Severity <span class="req">*</span></label>
                <select name="edImpact" [(ngModel)]="editDeviationForm.impact" required>
                  <option value="Minor">Minor</option>
                  <option value="Major">Major</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div class="field">
                <label>Detected By <span class="req">*</span></label>
                <input type="number" name="edDetBy" [(ngModel)]="editDeviationForm.detectedById" placeholder="Staff ID" required>
              </div>
              <div class="field">
                <label>Detection Date <span class="req">*</span></label>
                <input type="date" name="edDetDate" [(ngModel)]="editDeviationForm.detectionDate" required>
              </div>
              <div class="field full">
                <label>Description (Reason) <span class="req">*</span></label>
                <input type="text" name="edDesc" [(ngModel)]="editDeviationForm.description" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Save</button>
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
                <label>Assigned To <span class="req">*</span></label>
                <select name="capaAss" [(ngModel)]="createCapaForm.assignedToId" required>
                  <option *ngFor="let s of staffList" [ngValue]="s.id">{{ s.name }}</option>
                </select>
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
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 2b. VIEW CAPA MODAL (read-only) -->
      <div class="modal-overlay dvc" *ngIf="showViewCapaModal()">
        <div class="modal">
          <button class="modal-close-x" (click)="showViewCapaModal.set(false)" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2 class="with-sub">CAPA Details</h2>
          <p class="modal-sub">{{ viewCapa()?.capaId }}</p>
          <div class="detail-grid">
            <div class="detail-field"><label>CAPA Code</label><div class="value">{{ viewCapa()?.capaId }}</div></div>
            <div class="detail-field"><label>Deviation</label><div class="value">{{ selectedDeviation()?.deviationId }}</div></div>
            <div class="detail-field"><label>Assigned To</label><div class="value">{{ getAssignedTo(viewCapa()) }}</div></div>
            <div class="detail-field"><label>Status</label><div class="value"><span class="badge" [ngClass]="capaStatusClass(viewCapa()?.status)">{{ viewCapa()?.status }}</span></div></div>
            <div class="detail-field"><label>Due Date</label><div class="value">{{ viewCapa()?.dueDate ? (viewCapa()?.dueDate | date:'mediumDate') : '—' }}</div></div>
            <div class="detail-field"><label>Closed Date</label><div class="value">{{ viewCapa()?.closedDate ? (viewCapa()?.closedDate | date:'mediumDate') : '—' }}</div></div>
            <div class="detail-field" style="grid-column:1 / -1"><label>Root Cause</label><p class="description-text">{{ viewCapa()?.rootCause }}</p></div>
            <div class="detail-field" style="grid-column:1 / -1"><label>Corrective Action Plan (CAP)</label><p class="description-text">{{ viewCapa()?.correctiveAction }}</p></div>
            <div class="detail-field" style="grid-column:1 / -1"><label>Preventive Action Plan (PAP)</label><p class="description-text">{{ viewCapa()?.preventiveAction }}</p></div>
          </div>
        </div>
      </div>

      <!-- 2c. EDIT CAPA MODAL -->
      <div class="modal-overlay" *ngIf="showEditCapaModal()">
        <div class="modal">
          <button class="modal-close-x" (click)="confirmDiscard() && showEditCapaModal.set(false)" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2 class="with-sub">Edit CAPA</h2>
          <p class="modal-sub">Update the corrective and preventive action plan</p>
          <form (ngSubmit)="handleUpdateCapa()">
            <div class="form-grid">
              <div class="field">
                <label>CAPA Code</label>
                <input type="text" name="ecId" [value]="editCapaForm.capaId" disabled>
              </div>
              <div class="field">
                <label>Assigned To <span class="req">*</span></label>
                <select name="ecAss" [(ngModel)]="editCapaForm.assignedToId" required>
                  <option *ngFor="let s of staffList" [ngValue]="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="field">
                <label>Status <span class="req">*</span></label>
                <select name="ecStatus" [(ngModel)]="editCapaForm.status" required>
                  <option value="Open">Open</option>
                  <option value="InProgress">InProgress</option>
                  <option value="Closed">Closed</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div class="field">
                <label>Target Due Date <span class="req">*</span></label>
                <input type="date" name="ecDue" [(ngModel)]="editCapaForm.dueDate" required>
              </div>
              <div class="field full">
                <label>Investigation Root Cause <span class="req">*</span></label>
                <input type="text" name="ecRoot" [(ngModel)]="editCapaForm.rootCause" required>
              </div>
              <div class="field full">
                <label>Corrective Action Plan (CAP) <span class="req">*</span></label>
                <input type="text" name="ecCorr" [(ngModel)]="editCapaForm.correctiveAction" required>
              </div>
              <div class="field full">
                <label>Preventive Action Plan (PAP) <span class="req">*</span></label>
                <input type="text" name="ecPrev" [(ngModel)]="editCapaForm.preventiveAction" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Save</button>
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

    /* ============================================================
       Deviation & CAPA — redesigned list view (scoped)
       ============================================================ */
    :host {
      --st-green-bg:#E4F3E9; --st-green-tx:#2F7D46;
      --st-amber-bg:#FCEEDD; --st-amber-tx:#B4610E;
      --st-blue-bg:#E3F0FB;  --st-blue-tx:#2C6FA6;
      --st-red-bg:#FBE6E4;   --st-red-tx:#C0392B;
      --st-purple-bg:#F0E9F5; --st-purple-tx:#7A4F9E;
      --st-gray-bg:#EEE9E2;  --st-gray-tx:#6b6156;
      --dvc-radius:16px;
      --dvc-shadow:0 10px 30px rgba(60,35,15,.08);
    }

    .dvc .page-head { align-items: flex-start; }
    .dvc .page-title { font-size: 30px; letter-spacing: -.01em; }
    .dvc .page-sub { font-size: 14.5px; }

    /* + Log button: tight gap + tooltip */
    .dvc .tip { position: relative; display: inline-flex; }
    .dvc .tip::after {
      content: attr(data-tip);
      position: absolute; top: calc(100% + 10px); left: 50%; transform: translateX(-50%);
      background: #2b1a10; color: #fff; font-size: 12px; font-weight: 500;
      padding: 6px 10px; border-radius: 8px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 40;
    }
    .dvc .tip::before {
      content: ""; position: absolute; top: calc(100% + 4px); left: 50%;
      transform: translateX(-50%); border: 6px solid transparent;
      border-bottom-color: #2b1a10; opacity: 0; transition: opacity .15s; z-index: 40;
    }
    .dvc .tip:hover::after, .dvc .tip:hover::before { opacity: 1; }
    .dvc .btn-primary { padding: 12px 20px; border-radius: 12px; }
    .dvc .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .dvc .btn-create { gap: 4px; }

    /* Stat cards */
    .dvc .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 26px; }
    .dvc .stat { background: var(--card); border: 1px solid var(--border); border-radius: var(--dvc-radius); padding: 22px 24px; box-shadow: var(--dvc-shadow); }
    .dvc .stat-row { display: flex; align-items: flex-start; justify-content: space-between; }
    .dvc .stat-label { color: var(--text-dim); font-size: 14px; }
    .dvc .stat-ic { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
    .dvc .stat-num { font-size: 40px; font-weight: 800; margin-top: 22px; letter-spacing: -.02em; font-family: 'Manrope', sans-serif; }
    .dvc .ic-amber { background: var(--st-amber-bg); color: var(--st-amber-tx); }
    .dvc .ic-blue  { background: var(--st-blue-bg);  color: var(--st-blue-tx); }
    .dvc .ic-green { background: var(--st-green-bg); color: var(--st-green-tx); }
    .dvc .ic-red   { background: var(--st-red-bg);   color: var(--st-red-tx); }
    .dvc .tx-blue  { color: var(--st-blue-tx); }
    .dvc .tx-green { color: var(--st-green-tx); }
    .dvc .tx-red   { color: var(--st-red-tx); }

    /* Toolbar */
    .dvc .toolbar { display: flex; gap: 16px; margin-bottom: 22px; }
    .dvc .search { flex: 1; display: flex; align-items: center; gap: 10px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 0 16px; height: 52px; color: var(--text-dim); }
    .dvc .search input { border: none; outline: none; background: transparent; font-size: 15px; width: 100%; font-family: inherit; color: var(--text); }
    .dvc .status-filter { position: relative; }
    .dvc .status-trigger { height: 52px; padding: 0 14px; display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--border); border-radius: 12px; background: var(--card); color: var(--text-dim); cursor: pointer; }
    .dvc .status-trigger:hover { background: #faf6f0; color: var(--text); }
    .dvc .status-trigger.filtered { border-color: var(--accent); color: var(--accent); }
    .dvc .status-menu { position: absolute; right: 0; top: 58px; z-index: 30; min-width: 210px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 24px 60px rgba(40,20,8,.28); padding: 6px; display: none; }
    .dvc .status-menu.open { display: block; }
    .dvc .status-menu button { width: 100%; text-align: left; background: none; border: none; padding: 10px 12px; border-radius: 8px; font-size: 14px; cursor: pointer; color: var(--text); font-family: inherit; }
    .dvc .status-menu button:hover { background: var(--accent-light); color: var(--accent-dark); }
    .dvc .status-menu button.active { background: var(--accent-light); color: var(--accent-dark); font-weight: 700; }

    /* Table card */
    .dvc .card-block { background: var(--card); border: 1px solid var(--border); border-radius: var(--dvc-radius); box-shadow: var(--dvc-shadow); overflow: visible; }
    .dvc .block-head { display: flex; align-items: center; gap: 12px; padding: 22px 26px 6px; }
    .dvc .block-head h3 { margin: 0; font-size: 20px; font-weight: 800; }
    .dvc .block-head .count { color: var(--text-dim); font-weight: 500; font-size: 14px; }
    .dvc .block-spacer { flex: 1; }

    /* Export */
    .dvc .export-wrap { position: relative; }
    .dvc .btn-ghost { background: var(--card); color: var(--text); border: 1px solid var(--border); border-radius: 12px; padding: 10px 16px; font-weight: 600; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-family: inherit; }
    .dvc .btn-ghost:hover { background: #faf6f0; }
    .dvc .export-menu { position: absolute; right: 0; top: 48px; z-index: 30; min-width: 190px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 24px 60px rgba(40,20,8,.28); padding: 6px; display: none; }
    .dvc .export-menu.open { display: block; }
    .dvc .export-menu button { width: 100%; display: flex; align-items: center; gap: 10px; background: none; border: none; padding: 10px 12px; border-radius: 8px; font-size: 14px; cursor: pointer; color: var(--text); font-family: inherit; text-align: left; }
    .dvc .export-menu button:hover { background: var(--accent-light); color: var(--accent-dark); }

    /* Table (no horizontal scroll) */
    .dvc table.dvc-table { width: 100%; border-collapse: collapse; }
    .dvc .dvc-table thead th { text-align: left; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-dim); font-weight: 600; padding: 16px 26px; border-bottom: 1px solid var(--border); }
    .dvc .dvc-table tbody td { padding: 18px 26px; border-bottom: 1px solid var(--border); font-size: 14.5px; vertical-align: middle; }
    .dvc .dvc-table tbody tr:last-child td { border-bottom: none; }
    .dvc .dvc-table tbody tr:hover { background: #faf6f0; }
    .dvc .dvc-table th.right, .dvc .dvc-table td.right { text-align: right; }
    .dvc .cell-title b { display: block; font-size: 15px; }
    .dvc .cell-title small { color: var(--text-dim); font-size: 12.5px; letter-spacing: .03em; }

    /* Badges (available in list, modals) */
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600; }
    .b-green  { background: var(--st-green-bg);  color: var(--st-green-tx); }
    .b-amber  { background: var(--st-amber-bg);  color: var(--st-amber-tx); }
    .b-blue   { background: var(--st-blue-bg);   color: var(--st-blue-tx); }
    .b-red    { background: var(--st-red-bg);    color: var(--st-red-tx); }
    .b-purple { background: var(--st-purple-bg); color: var(--st-purple-tx); }
    .b-gray   { background: var(--st-gray-bg);   color: var(--st-gray-tx); }

    /* Row action menu */
    .dvc .row-actions { position: relative; display: inline-flex; }
    .dvc .icon-menu-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--border); background: var(--card); display: grid; place-items: center; cursor: pointer; color: var(--text-dim); }
    .dvc .icon-menu-btn:hover { background: #faf6f0; color: var(--text); }
    .dvc .row-menu { position: absolute; right: 0; top: 46px; z-index: 20; background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 24px 60px rgba(40,20,8,.28); min-width: 158px; padding: 6px; display: none; }
    .dvc .row-actions:hover .row-menu, .dvc .row-actions:focus-within .row-menu { display: block; }
    .dvc .row-menu .dropdown-item:hover { background: var(--accent-light); color: var(--accent-dark); }

    /* Pagination */
    .dvc .table-footer { padding: 16px 26px; }
    .dvc .pager .page-num { width: auto; min-width: 30px; height: 30px; padding: 0 8px; font-size: 13.5px; font-weight: 600; }
    .dvc .pager .page-num.active { background: var(--accent); color: #fff; border-color: var(--accent); }

    /* Modal subtitle */
    .modal h2.with-sub { margin-bottom: 6px; }

    /* Detail page (batch-manufacturing style) */
    .dvc .crumb-link { color: var(--text-dim); cursor: pointer; }
    .dvc .crumb-link:hover { color: var(--accent); text-decoration: underline; }
    .dvc .page-head.detail-title-row { align-items: center; }
    .dvc .status-lg { font-size: 13.5px; padding: 8px 16px; }
    .dvc .detail-summary { display: flex; align-items: center; gap: 40px; flex-wrap: wrap; background: var(--card); border: 1px solid var(--border); border-radius: var(--dvc-radius); padding: 22px 26px; margin-bottom: 24px; box-shadow: var(--dvc-shadow); }
    .dvc .sum-item .sum-k { font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); font-weight: 700; margin-bottom: 8px; }
    .dvc .sum-item .sum-v { font-size: 16px; font-weight: 700; }
    .dvc .sum-spacer { flex: 1; }
    .dvc .detail-actions { display: flex; align-items: center; gap: 10px; }
    .dvc .icon-action { width: 44px; height: 44px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--card); display: inline-flex; align-items: center; justify-content: center; color: var(--text-dim); cursor: pointer; }
    .dvc .icon-action:hover { background: #faf6f0; color: var(--text); }
    .dvc .icon-action:disabled { opacity: .4; cursor: not-allowed; }
    .dvc .icon-action:disabled:hover { background: var(--card); color: var(--text-dim); }
    .dvc .send-icon { background: var(--accent); color: #fff; border-color: var(--accent); }
    .dvc .send-icon:hover { background: var(--accent-dark); color: #fff; }
    .dvc .send-icon:disabled { opacity: .4; cursor: not-allowed; }
    .dvc .send-icon:disabled:hover { background: var(--accent); }
    .dvc .section-bar { display: flex; align-items: center; margin: 4px 0 14px; }
    .dvc .section-bar h3 { margin: 0; font-size: 21px; font-weight: 800; }
    .dvc .section-spacer { flex: 1; }
    .dvc .review-filter { position: relative; }
    .dvc .review-menu { position: absolute; right: 0; top: 52px; z-index: 30; min-width: 170px; background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 24px 60px rgba(40,20,8,.28); padding: 6px; display: none; }
    .dvc .review-menu.open { display: block; }
    .dvc .review-menu button { width: 100%; text-align: left; background: none; border: none; padding: 10px 12px; border-radius: 8px; font-size: 14px; cursor: pointer; color: var(--text); font-family: inherit; }
    .dvc .review-menu button:hover { background: var(--accent-light); color: var(--accent-dark); }

    @media (max-width: 1080px) {
      .dvc .stats { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class DeviationsComponent implements OnInit {
  private apiService = inject(ApiService);
  private auth = inject(AuthService);

  // Only a QA Analyst may create/send/transition/edit deviations & CAPAs.
  // Everyone else has read-only (View) access.
  canManage(): boolean {
    const r = this.auth.role();
    return r === 'QAAnalyst' || r === 'QA Analyst';
  }

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  deviations = signal<any[]>([]);
  capas = signal<any[]>([]);
  signatureHistory = signal<any[]>([]);

  // Selection
  selectedDeviation = signal<any | null>(null);
  detailTab = signal<'details' | 'capa' | 'signatures'>('details');

  // Sub-tabs navigation helpers (legacy detail view; retained)
  capaTabs: { [capaId: string]: string } = {};

  // Staff directory (names shown in dropdowns; id sent to backend)
  staffList = [
    { id: 1, name: 'Arjun Rao' },
    { id: 2, name: 'Nita Shah' },
    { id: 3, name: 'Meera Nair' },
    { id: 4, name: 'Rahul Verma' }
  ];

  // Detail status dropdown (CAPA Created / Closed)
  devReviewMenuOpen = signal<boolean>(false);

  // CAPA table pagination (detail view)
  capaPage = signal<number>(1);
  capaPageSize = 5;

  // CAPA view / edit popups
  showViewCapaModal = signal<boolean>(false);
  viewCapa = signal<any | null>(null);
  showEditCapaModal = signal<boolean>(false);
  editCapaForm = {
    capaId: '',
    assignedToId: null as any,
    dueDate: '',
    closedDate: null as any,
    rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    status: 'Open'
  };

  // Pagination states
  page = signal<number>(1);
  pageSize = 8;

  // List filtering + dropdowns
  searchTerm = signal<string>('');
  statusFilter = signal<string>('');
  statusMenuOpen = signal<boolean>(false);
  exportMenuOpen = signal<boolean>(false);

  // Modals Visibility
  showCreateDeviationModal = signal<boolean>(false);
  showViewDeviationModal = signal<boolean>(false);
  showEditDeviationModal = signal<boolean>(false);
  showCreateCapaModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // View / edit deviation state
  viewDeviation = signal<any | null>(null);
  editDeviationForm = {
    deviationId: '',
    relatedEntityType: 'BatchRecord',
    relatedEntityId: '',
    description: '',
    detectedById: '1' as any,
    detectionDate: '',
    impact: 'Minor',
    status: 'Open'
  };

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
      next: (data) => this.deviations.set(data || []),
      error: (err) => this.showError(err.error?.message || 'Error fetching logged deviations ledger.')
    });
  }

  // ---- List filtering / stats / pagination ----
  private matchesStatus(status: string, filter: string): boolean {
    if (filter === 'Under Investigation') return status === 'Under Investigation' || status === 'UnderInvestigation';
    if (filter === 'CAPA Created') return status === 'CAPA Created' || status === 'CAPAAssigned' || status === 'CAPA Assigned';
    if (filter === 'Closed') return status === 'Closed' || status === 'CLS';
    return status === filter;
  }

  filteredDeviations() {
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.statusFilter();
    return this.deviations().filter(d => {
      if (status && !this.matchesStatus(d.status, status)) return false;
      if (!term) return true;
      const hay = [d.description, d.deviationId, d.relatedEntityType, d.relatedEntityId, this.getDetectedBy(d), d.impact, d.status].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }

  paginatedDeviations() {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredDeviations().slice(start, start + this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDeviations().length / this.pageSize));
  }
  pages(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  openCount(): number {
    return this.deviations().filter(d => d.status === 'Open').length;
  }
  underInvestigationCount(): number {
    return this.deviations().filter(d => d.status === 'Under Investigation' || d.status === 'UnderInvestigation').length;
  }
  closedCount(): number {
    return this.deviations().filter(d => d.status === 'Closed' || d.status === 'CLS').length;
  }

  entityLabel(type: string): string {
    switch (type) {
      case 'BatchRecord': return 'Batch';
      case 'DrugShipment': return 'Shipment';
      case 'TrialProtocol': return 'Trial';
      default: return type || '—';
    }
  }
  getDetectedBy(dev: any): string {
    if (!dev) return '';
    return dev.detectedByName || dev.detectedBy || this.staffName(dev.detectedById);
  }
  impactClass(impact: string): string {
    switch (impact) {
      case 'Critical': return 'b-red';
      case 'Major': return 'b-amber';
      case 'Minor': return 'b-gray';
      default: return 'b-gray';
    }
  }
  statusClass(status: string): string {
    switch (status) {
      case 'Open': return 'b-amber';
      case 'Under Investigation':
      case 'UnderInvestigation': return 'b-blue';
      case 'CAPA Created':
      case 'CAPAAssigned':
      case 'CAPA Assigned': return 'b-purple';
      case 'Closed':
      case 'CLS': return 'b-green';
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
  toggleExportMenu(e: Event) {
    e.stopPropagation();
    this.statusMenuOpen.set(false);
    this.exportMenuOpen.update(v => !v);
  }
  @HostListener('document:click')
  closeMenus() {
    this.statusMenuOpen.set(false);
    this.exportMenuOpen.set(false);
    this.devReviewMenuOpen.set(false);
  }

  exportData(type: 'pdf' | 'excel') {
    this.exportMenuOpen.set(false);
    const rows = this.filteredDeviations().map(d => ({
      Deviation: d.deviationId,
      Reason: d.description,
      'Related Entity': `${this.entityLabel(d.relatedEntityType)} · ${d.relatedEntityId}`,
      'Detected By': this.getDetectedBy(d),
      Impact: d.impact,
      Status: d.status,
      'Detection Date': d.detectionDate || ''
    }));
    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Deviations');
      XLSX.writeFile(wb, 'PharmaTrack_Deviations.xlsx');
      this.showSuccess('Deviations exported to Excel successfully.');
    } else {
      const doc = new jsPDF();
      doc.text('PharmaTrack — Deviation & CAPA', 14, 15);
      autoTable(doc, {
        head: [['Deviation', 'Reason', 'Related Entity', 'Detected By', 'Impact', 'Status', 'Detection Date']],
        body: rows.map(r => [r.Deviation, r.Reason, r['Related Entity'], r['Detected By'], r.Impact, r.Status, r['Detection Date']]),
        startY: 22,
        theme: 'striped',
        headStyles: { fillColor: [206, 82, 0] }
      });
      doc.save('PharmaTrack_Deviations.pdf');
      this.showSuccess('Deviations exported to PDF successfully.');
    }
  }

  openViewDeviation(dev: any) {
    this.viewDeviation.set(dev);
    this.showViewDeviationModal.set(true);
  }
  openEditDeviation(dev: any) {
    this.editDeviationForm = {
      deviationId: dev.deviationId,
      relatedEntityType: dev.relatedEntityType || 'BatchRecord',
      relatedEntityId: dev.relatedEntityId,
      description: dev.description,
      detectedById: dev.detectedById,
      detectionDate: dev.detectionDate,
      impact: dev.impact || 'Minor',
      status: dev.status || 'Open'
    };
    this.showEditDeviationModal.set(true);
    this.clearMessages();
  }
  handleUpdateDeviation() {
    this.apiService.updateDeviation(this.editDeviationForm.deviationId, this.editDeviationForm).subscribe({
      next: () => {
        this.showSuccess('Deviation record updated successfully.');
        this.showEditDeviationModal.set(false);
        this.fetchDeviations();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to update deviation record.')
    });
  }

  viewDeviationDetails(dev: any) {
    this.selectedDeviation.set(dev);
    this.detailTab.set('details');
    this.capaPage.set(1);
    this.clearMessages();
    this.fetchCapas(dev.deviationId);
    this.fetchSignatureHistory(dev.deviationId);
  }

  fetchCapas(deviationId: string) {
    this.apiService.getCapasByDeviation(deviationId).subscribe({
      next: (data) => this.capas.set(data || []),
      error: () => this.capas.set([])
    });
  }

  paginatedCapas() {
    const start = (this.capaPage() - 1) * this.capaPageSize;
    return this.capas().slice(start, start + this.capaPageSize);
  }
  capaTotalPages(): number {
    return Math.max(1, Math.ceil(this.capas().length / this.capaPageSize));
  }
  capaPages(): number[] {
    return Array.from({ length: this.capaTotalPages() }, (_, i) => i + 1);
  }
  staffName(id: any): string {
    const s = this.staffList.find(x => x.id === Number(id));
    return s ? s.name : (id ? `Staff #${id}` : '—');
  }
  getAssignedTo(capa: any): string {
    if (!capa) return '';
    return capa.assignedToName || capa.assignedTo || this.staffName(capa.assignedToId);
  }
  showDevReview(): boolean {
    const s = this.selectedDeviation()?.status;
    return s === 'Under Investigation' || s === 'UnderInvestigation' || s === 'CAPA Created' || s === 'CAPAAssigned';
  }
  toggleDevReviewMenu(e: Event) {
    e.stopPropagation();
    this.devReviewMenuOpen.update(v => !v);
  }
  chooseDevReview(value: string) {
    this.devReviewMenuOpen.set(false);
    this.updateDeviationStatus(value);
  }
  capaStatusClass(status: string): string {
    switch (status) {
      case 'Closed':
      case 'CLS': return 'b-green';
      case 'InProgress':
      case 'In Progress': return 'b-blue';
      case 'Open': return 'b-amber';
      case 'Overdue': return 'b-red';
      default: return 'b-gray';
    }
  }
  startInvestigation() {
    if (this.selectedDeviation()?.status === 'Open') {
      this.updateDeviationStatus('Under Investigation');
    }
  }
  openViewCapa(capa: any) {
    this.viewCapa.set(capa);
    this.showViewCapaModal.set(true);
  }
  openEditCapa(capa: any) {
    const assigned = this.staffList.find(s => String(s.id) === String(capa.assignedToId));
    this.editCapaForm = {
      capaId: capa.capaId,
      assignedToId: assigned ? assigned.id : (capa.assignedToId != null ? Number(capa.assignedToId) : null),
      dueDate: capa.dueDate,
      closedDate: capa.closedDate || null,
      rootCause: capa.rootCause,
      correctiveAction: capa.correctiveAction,
      preventiveAction: capa.preventiveAction,
      status: capa.status || 'Open'
    };
    this.showEditCapaModal.set(true);
    this.clearMessages();
  }
  handleUpdateCapa() {
    const payload = { ...this.editCapaForm, deviationId: this.selectedDeviation()?.deviationId };
    this.apiService.updateCapa(this.editCapaForm.capaId, payload).subscribe({
      next: () => {
        this.showSuccess('CAPA record updated successfully.');
        this.showEditCapaModal.set(false);
        this.fetchCapas(this.selectedDeviation().deviationId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to update CAPA record.')
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
