import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-regulatory-affairs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ══════════ LIST VIEW: Dossiers Registry ══════════ -->
    <div *ngIf="!selectedDossier()">
      <div class="page-head">
        <div>
          <h1 class="page-title">Regulatory Dossiers</h1>
          <div class="page-sub">Submissions, target markets and milestone tracking</div>
        </div>
        <div class="tooltip-wrap">
          <button class="btn btn-primary" (click)="openCreateDossier()" aria-label="Create Dossier">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Dossier
          </button>
          <span class="tooltip-bubble">Create Dossier</span>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <div class="kpi-grid">
        <div class="kpi-card tone-neutral">
          <div class="kpi-top"><div class="kpi-label">Total Dossiers</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg></div></div>
          <div class="kpi-value">{{ dossiers().length }}</div>
        </div>
        <div class="kpi-card tone-accent">
          <div class="kpi-top"><div class="kpi-label">Submitted</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div></div>
          <div class="kpi-value">{{ countByStatus('Submitted') }}</div>
        </div>
        <div class="kpi-card tone-warning">
          <div class="kpi-top"><div class="kpi-label">Under Review</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div></div>
          <div class="kpi-value">{{ countByStatus('UnderReview') }}</div>
        </div>
        <div class="kpi-card tone-green">
          <div class="kpi-top"><div class="kpi-label">Approved</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></div></div>
          <div class="kpi-value">{{ countByStatus('Approved') }}</div>
        </div>
      </div>

      <div class="filter-row">
        <div class="input-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Search dossier, product or market" [(ngModel)]="search" (ngModelChange)="page.set(1)">
        </div>
        <div class="filter-select">
          <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select [(ngModel)]="typeFilter" (ngModelChange)="page.set(1)" aria-label="Filter by Type">
            <option value="All types">All types</option>
            <option value="IND">IND</option>
            <option value="NDA">NDA</option>
            <option value="ANDA">ANDA</option>
            <option value="CTD">CTD</option>
            <option value="Variation">Variation</option>
          </select>
          <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="filter-select">
          <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select [(ngModel)]="statusFilter" (ngModelChange)="page.set(1)" aria-label="Filter by Status">
            <option value="All statuses">All statuses</option>
            <option value="InPreparation">InPreparation</option>
            <option value="Submitted">Submitted</option>
            <option value="UnderReview">UnderReview</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <div class="table-card">
        <div class="table-card-head"><h3>All Dossiers <span class="count">· {{ filteredDossiers().length }} total</span></h3></div>
        <div class="table-scroll">
          <table>
            <thead><tr><th>Dossier ID</th><th>Product</th><th>Type</th><th>Target Market</th><th>Submission Date</th><th>Status</th><th style="text-align:center;">Actions</th></tr></thead>
            <tbody>
              <tr *ngFor="let d of pagedDossiers()">
                <td class="name-cell">{{ d.dossierId }}</td>
                <td class="mono">{{ productName(d.productId) }}</td>
                <td class="tag">{{ d.submissionType }}</td>
                <td>{{ d.targetMarket || '—' }}</td>
                <td>{{ d.submissionDate || '—' }}</td>
                <td><span class="badge-status" [ngClass]="dossierBadge(d.status)">{{ d.status }}</span></td>
                <td class="actions-cell">
                  <div class="dropdown">
                    <button class="icon-menu-btn" (click)="toggleMenu('dos-' + d.dossierId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                    <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'dos-' + d.dossierId">
                      <button type="button" class="dropdown-item" (click)="viewDossier(d)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                      <button type="button" class="dropdown-item" (click)="openEditDossier(d)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredDossiers().length === 0">
                <td colspan="7"><div class="empty-state">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                  <strong>No dossiers yet</strong>Create your first regulatory dossier to get started.</div></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer">
          <div>{{ filteredDossiers().length }} record{{ filteredDossiers().length === 1 ? '' : 's' }}</div>
          <div class="pager" *ngIf="totalPages() > 1">
            <button [disabled]="page() === 1" (click)="page.set(page() - 1)" aria-label="Previous page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
            <span>Page {{ page() }} of {{ totalPages() }}</span>
            <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" aria-label="Next page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>
          <div *ngIf="totalPages() <= 1"><span>Sorted ascending by Dossier ID</span></div>
        </div>
      </div>
    </div>

    <!-- ══════════ DETAIL VIEW ══════════ -->
    <div *ngIf="selectedDossier() as d">
      <div class="breadcrumb"><a (click)="closeDetail()">Dossiers</a> / <strong>{{ d.dossierId }}</strong></div>
      <div class="view-card">
        <h1 class="page-title">{{ d.dossierId }}</h1>
        <div class="page-sub">{{ d.submissionType }} submission · Product {{ productName(d.productId) }}</div>

        <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

        <div class="status-row">
          <div class="detail-field"><label>Status</label><span class="badge-status" [ngClass]="dossierBadge(d.status)">{{ d.status }}</span></div>
          <div class="detail-field"><label>Product</label><div class="value">{{ productName(d.productId) }}</div></div>
          <div class="detail-field"><label>Target Market</label><div class="value">{{ d.targetMarket || '—' }}</div></div>
          <div class="detail-field"><label>Submission Date</label><div class="value">{{ d.submissionDate || '—' }}</div></div>
          <div class="detail-field"><label>Assigned Officer</label><div class="value">{{ d.assignedOfficerId || '—' }}</div></div>
          <div class="detail-field"><label>Submission Type</label><div class="value">{{ d.submissionType || '—' }}</div></div>
          <div class="status-action-btns">
            <button class="status-action-btn" (click)="openEditDossier(d)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit Dossier</button>
          </div>
        </div>

        <div class="section-block">
          <div class="section-head">
            <h3>Milestones</h3>
            <div class="tooltip-wrap">
              <button class="btn btn-primary btn-sm" (click)="openCreateMilestone()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Milestone</button>
              <span class="tooltip-bubble">Create Milestone</span>
            </div>
          </div>
          <div class="section-box">
            <table class="mini-table">
              <thead><tr><th>Milestone ID</th><th>Name</th><th>Due Date</th><th>Status</th><th class="actions-cell">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let m of milestones()">
                  <td class="name-cell">{{ m.milestoneId }}</td>
                  <td>{{ m.milestoneType }}</td>
                  <td>{{ m.milestoneDate || '—' }}</td>
                  <td><span class="badge-status" [ngClass]="milestoneBadge(m.status)">{{ m.status }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleMenu('ms-' + m.milestoneId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'ms-' + m.milestoneId">
                        <button type="button" class="dropdown-item" (click)="viewMilestone(m)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" (click)="openEditMilestone(m)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="milestones().length === 0"><td colspan="5" style="padding:34px;text-align:center;color:var(--text-dim);">No milestones yet. Create one to start tracking.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ CREATE / EDIT DOSSIER MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="showDossierModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showDossierModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>{{ dossierEditing ? 'Edit Dossier' : 'Create Dossier' }}</h2>
        <div class="modal-sub">Define submission type, target market and assigned officer</div>
        <form (ngSubmit)="saveDossier()">
          <div class="form-grid">
            <div class="field"><label>Dossier ID<span class="req">*</span></label><input type="text" [value]="dossierForm.dossierId" readonly><div class="hint">Auto-generated</div></div>
            <div class="field"><label>Product<span class="req">*</span></label>
              <select name="productId" [(ngModel)]="dossierForm.productId" required>
                <option value="">Select…</option>
                <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
              </select>
            </div>
            <div class="field"><label>Submission Type<span class="req">*</span></label>
              <select name="submissionType" [(ngModel)]="dossierForm.submissionType" required>
                <option value="">Select…</option>
                <option>IND</option><option>NDA</option><option>ANDA</option><option>CTD</option><option>Variation</option>
              </select>
            </div>
            <div class="field"><label>Target Market</label><input type="text" name="targetMarket" [(ngModel)]="dossierForm.targetMarket" placeholder="e.g. US, EU"></div>
            <div class="field"><label>Submission Date</label><input type="date" name="submissionDate" [(ngModel)]="dossierForm.submissionDate"></div>
            <div class="field"><label>Assigned Officer ID</label><input type="text" name="assignedOfficerId" [(ngModel)]="dossierForm.assignedOfficerId" placeholder="e.g. USR010"></div>
            <div class="field"><label>Status<span class="req">*</span></label>
              <select name="status" [(ngModel)]="dossierForm.status" required>
                <option>InPreparation</option><option>Submitted</option><option>UnderReview</option><option>Approved</option><option>Rejected</option><option>Withdrawn</option>
              </select>
            </div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ CREATE / EDIT MILESTONE MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="showMilestoneModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showMilestoneModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>{{ milestoneEditing ? 'Edit Milestone' : 'Create Milestone' }}</h2>
        <div class="modal-sub">Track a submission milestone for this dossier</div>
        <form (ngSubmit)="saveMilestone()">
          <div class="form-grid">
            <div class="field"><label>Milestone ID<span class="req">*</span></label><input type="text" [value]="milestoneForm.milestoneId" readonly><div class="hint">Auto-generated</div></div>
            <div class="field"><label>Dossier ID<span class="req">*</span></label><input type="text" [value]="milestoneForm.dossierId" readonly><div class="hint">Auto-filled</div></div>
            <div class="field"><label>Name<span class="req">*</span></label><input type="text" name="milestoneType" [(ngModel)]="milestoneForm.milestoneType" placeholder="e.g. Pre-submission meeting" required></div>
            <div class="field"><label>Status<span class="req">*</span></label>
              <select name="msStatus" [(ngModel)]="milestoneForm.status" required>
                <option>Pending</option><option>InProgress</option><option>Completed</option>
              </select>
            </div>
            <div class="field"><label>Due Date</label><input type="date" name="milestoneDate" [(ngModel)]="milestoneForm.milestoneDate"></div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ VIEW MILESTONE MODAL ══════════ -->
    <div class="modal-overlay" *ngIf="viewMilestoneData()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="viewMilestoneData.set(null)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Milestone Details</h2>
        <div class="detail-grid" *ngIf="viewMilestoneData() as m">
          <div class="detail-field"><label>Milestone ID</label><div class="value">{{ m.milestoneId }}</div></div>
          <div class="detail-field"><label>Dossier ID</label><div class="value">{{ m.dossierId }}</div></div>
          <div class="detail-field"><label>Name</label><div class="value">{{ m.milestoneType || '—' }}</div></div>
          <div class="detail-field"><label>Status</label><span class="badge-status" [ngClass]="milestoneBadge(m.status)">{{ m.status }}</span></div>
          <div class="detail-field"><label>Due Date</label><div class="value">{{ m.milestoneDate || '—' }}</div></div>
        </div>
        <div class="detail-field" style="margin-top:18px;" *ngIf="viewMilestoneData() as m"><label>Notes</label><div class="value dim">{{ m.notes || '—' }}</div></div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;}
    .badge-status{display:inline-block;padding:5px 12px;border-radius:20px;font-size:12.5px;font-weight:700;white-space:nowrap;}
    .badge-active{background:var(--accent-light);color:var(--accent-dark);}
    .badge-draft{background:#eef0ef;color:#3c463f;}
    .badge-suspended{background:var(--warning-light);color:var(--warning);}
    .badge-progress{background:var(--warning-light);color:var(--warning);}
    .badge-completed{background:var(--blue-light);color:var(--blue);}
    .badge-approved{background:#e6f4ec;color:#2f7d4f;}
    .badge-terminated{background:var(--danger-light);color:var(--danger);}
    .tone-green .kpi-icon{background:#e6f4ec;color:#2f7d4f;}
    .tone-green .kpi-value{color:#2f7d4f;}
    .tooltip-wrap{position:relative;display:inline-flex;}
    .tooltip-wrap .tooltip-bubble{position:absolute;bottom:calc(100% + 10px);right:0;background:var(--text);color:#fff;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .15s ease, transform .15s ease;z-index:40;}
    .tooltip-wrap .tooltip-bubble::after{content:'';position:absolute;top:100%;right:14px;border:6px solid transparent;border-top-color:var(--text);}
    .tooltip-wrap:hover .tooltip-bubble{opacity:1;transform:translateY(0);}
    .actions-cell{text-align:center;}
    .filter-select{position:relative;display:inline-flex;align-items:center;min-width:190px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;}
    .filter-select .funnel{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select .caret{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;width:100%;border:none;background:transparent;border-radius:var(--radius-sm);padding:11px 34px 11px 36px;font-size:14px;color:var(--text);font-family:inherit;cursor:pointer;}
    .filter-select select:focus{outline:none;}
    .breadcrumb a{color:var(--text-dim);text-decoration:none;cursor:pointer;}
    .breadcrumb a:hover{text-decoration:underline;}
    .breadcrumb strong{color:var(--text);font-weight:700;}
    .view-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:32px 36px;}
    .view-card .page-title{font-size:26px;}
    .status-row{display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;margin:24px 0 6px;padding:20px 26px;background:#fbfaf8;border:1px solid var(--border);border-radius:var(--radius-md);}
    .status-row .detail-field{flex:1 1 0;}
    .detail-field label{display:block;font-size:11px;font-weight:700;letter-spacing:.06em;color:var(--text-dim);text-transform:uppercase;margin-bottom:7px;}
    .detail-field .value{font-size:16px;font-weight:600;color:var(--text);}
    .status-action-btns{display:flex;gap:8px;margin-left:auto;flex-wrap:wrap;}
    .status-action-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:20px;border:1px solid var(--border);background:#fff;font-size:12.5px;font-weight:700;color:var(--text-dim);cursor:pointer;font-family:inherit;}
    .status-action-btn:hover{background:#f4f6f5;color:var(--text);}
    .section-block{margin-top:34px;}
    .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .section-head h3{margin:0;font-size:17px;font-weight:800;}
    .section-box{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}
    .mini-table{width:100%;border-collapse:collapse;}
    .mini-table th{text-align:left;padding:12px 18px;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--text-dim);text-transform:uppercase;background:#fbfaf8;border-bottom:1px solid var(--border);}
    .mini-table td{padding:14px 18px;font-size:14.5px;border-bottom:1px solid var(--border);color:var(--text);}
    .mini-table tr:last-child td{border-bottom:none;}
    .mini-table td.actions-cell{text-align:center;width:56px;}
    .modal{max-height:92vh;overflow-y:auto;position:relative;padding:26px 30px;}
    .modal h2{margin:0 0 4px;font-size:20px;}
    .modal-sub{color:var(--text-dim);font-size:13.5px;margin:0 0 16px;}
    .hint{font-size:11px;color:var(--text-dim);margin-top:4px;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px;margin-bottom:6px;}
    .field label{display:block;font-size:13.5px;font-weight:700;margin-bottom:6px;}
    .field label .req{color:var(--danger);margin-left:2px;}
    .field input, .field select{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:#fff;color:var(--text);}
    .field input[readonly]{background:#f4f6f5;color:var(--text-dim);}
    .modal-footer{display:flex;justify-content:flex-end;margin-top:18px;}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 40px;margin-bottom:6px;}
    .detail-field .value.dim{color:var(--text-dim);font-weight:500;line-height:1.5;}
    .btn-sm{padding:8px 14px;font-size:13px;}
    .alert{padding:11px 15px;border-radius:var(--radius-sm);margin-bottom:18px;font-size:13.5px;}
    .alert-error{background:var(--danger-light);color:var(--danger);border:1px solid #f5c2c0;}
    .alert-success{background:#e6f4ec;color:#2f7d4f;border:1px solid #c3e6d1;}
    .pager span{margin:0 6px;}
  `]
})
export class RegulatoryComponent implements OnInit {
  private api = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  saving = signal<boolean>(false);

  dossiers = signal<any[]>([]);
  products = signal<any[]>([]);
  allMilestones = signal<any[]>([]);

  selectedDossier = signal<any | null>(null);
  milestones = signal<any[]>([]);

  openMenu = signal<string | null>(null);

  search = '';
  typeFilter = 'All types';
  statusFilter = 'All statuses';

  page = signal<number>(1);
  pageSize = 10;

  showDossierModal = signal<boolean>(false);
  showMilestoneModal = signal<boolean>(false);
  viewMilestoneData = signal<any | null>(null);
  dossierEditing = false;
  milestoneEditing = false;

  dossierForm: any = {};
  milestoneForm: any = {};

  ngOnInit() {
    this.fetchProducts();
    this.fetchDossiers();
  }

  @HostListener('document:click')
  onDocClick() { this.openMenu.set(null); }

  toggleMenu(id: string, ev: Event) {
    ev.stopPropagation();
    this.openMenu.set(this.openMenu() === id ? null : id);
  }

  // ── data ──
  fetchDossiers() {
    this.api.getDossiers().subscribe({
      next: (data) => this.dossiers.set((data || []).slice().sort((a, b) => String(a.dossierId).localeCompare(String(b.dossierId)))),
      error: () => this.dossiers.set([])   // backend returns 404 when empty
    });
  }

  fetchProducts() {
    this.api.getProducts().subscribe({
      next: (res: any) => { if (res && res.success) this.products.set(res.data || []); },
      error: () => this.products.set([])
    });
  }

  productName(productId: any): string {
    const p = this.products().find(x => String(x.productId) === String(productId));
    return p ? p.productName : (productId || '—');
  }

  countByStatus(status: string): number {
    return this.dossiers().filter(d => (d.status || '') === status).length;
  }

  // ── filtering + paging ──
  filteredDossiers() {
    const q = (this.search || '').toLowerCase();
    return this.dossiers().filter(d => {
      const okT = this.typeFilter === 'All types' || d.submissionType === this.typeFilter;
      const okS = this.statusFilter === 'All statuses' || d.status === this.statusFilter;
      const okQ = !q || (String(d.dossierId) + ' ' + this.productName(d.productId) + ' ' + (d.targetMarket || '')).toLowerCase().includes(q);
      return okT && okS && okQ;
    });
  }

  totalPages() { return Math.max(1, Math.ceil(this.filteredDossiers().length / this.pageSize)); }

  pagedDossiers() {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredDossiers().slice(start, start + this.pageSize);
  }

  // ── badges ──
  dossierBadge(status: string): string {
    switch (status) {
      case 'Submitted': return 'badge-active';
      case 'UnderReview': case 'Under Review': return 'badge-suspended';
      case 'Approved': return 'badge-approved';
      case 'Rejected': return 'badge-terminated';
      case 'Withdrawn': return 'badge-draft';
      default: return 'badge-draft';
    }
  }
  milestoneBadge(status: string): string {
    switch (status) {
      case 'Completed': return 'badge-approved';
      case 'InProgress': return 'badge-suspended';
      default: return 'badge-draft';
    }
  }

  // ── id generation ──
  private nextId(arr: any[], key: string, prefix: string, pad: number): string {
    let max = 0;
    (arr || []).forEach(x => {
      const n = parseInt(String(x[key]).replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    let num = String(max + 1);
    while (num.length < pad) num = '0' + num;
    return prefix + num;
  }
  private today(): string { return new Date().toISOString().substring(0, 10); }

  // ── detail ──
  viewDossier(d: any) {
    this.openMenu.set(null);
    this.selectedDossier.set(d);
    this.clearMsg();
    this.fetchMilestones(d.dossierId);
  }
  closeDetail() { this.selectedDossier.set(null); this.clearMsg(); }

  fetchMilestones(dossierId: string) {
    this.api.getMilestonesByDossier(dossierId).subscribe({
      next: (data) => this.milestones.set((data || []).slice().sort((a, b) => String(a.milestoneId).localeCompare(String(b.milestoneId)))),
      error: () => this.milestones.set([])
    });
    this.api.getAllMilestones().subscribe({
      next: (data) => this.allMilestones.set(data || []),
      error: () => this.allMilestones.set([])
    });
  }

  // ── dossier create/edit ──
  openCreateDossier() {
    this.dossierEditing = false;
    this.dossierForm = {
      dossierId: this.nextId(this.dossiers(), 'dossierId', 'DOS', 3),
      productId: '', submissionType: '', targetMarket: '', submissionDate: '',
      assignedOfficerId: '', status: 'InPreparation'
    };
    this.clearMsg();
    this.showDossierModal.set(true);
  }
  openEditDossier(d: any) {
    this.openMenu.set(null);
    this.dossierEditing = true;
    this.dossierForm = {
      dossierId: d.dossierId, productId: d.productId, submissionType: d.submissionType,
      targetMarket: d.targetMarket || '', submissionDate: d.submissionDate || '',
      assignedOfficerId: d.assignedOfficerId || '', status: d.status || 'InPreparation'
    };
    this.clearMsg();
    this.showDossierModal.set(true);
  }
  saveDossier() {
    if (!this.dossierForm.productId || !this.dossierForm.submissionType) {
      this.showError('Product and Submission Type are required.');
      return;
    }
    this.saving.set(true);
    const payload = { ...this.dossierForm, submissionDate: this.dossierForm.submissionDate || null };
    const req = this.dossierEditing ? this.api.updateDossier(payload) : this.api.createDossier(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showDossierModal.set(false);
        this.showSuccess(this.dossierEditing ? 'Dossier updated successfully.' : 'Dossier created successfully.');
        this.fetchDossiers();
        if (this.selectedDossier() && this.selectedDossier().dossierId === payload.dossierId) {
          this.selectedDossier.set({ ...payload });
        }
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || err?.error || 'Failed to save dossier.'); }
    });
  }

  // ── milestone create/edit ──
  openCreateMilestone() {
    this.milestoneEditing = false;
    this.milestoneForm = {
      milestoneId: this.nextId(this.allMilestones().length ? this.allMilestones() : this.milestones(), 'milestoneId', 'MS', 3),
      dossierId: this.selectedDossier().dossierId,
      milestoneType: '', status: 'Pending', milestoneDate: this.today()
    };
    this.clearMsg();
    this.showMilestoneModal.set(true);
  }
  viewMilestone(m: any) { this.openMenu.set(null); this.viewMilestoneData.set(m); }
  openEditMilestone(m: any) {
    this.openMenu.set(null);
    this.milestoneEditing = true;
    this.milestoneForm = {
      milestoneId: m.milestoneId, dossierId: this.selectedDossier().dossierId,
      milestoneType: m.milestoneType, status: m.status || 'Pending', milestoneDate: m.milestoneDate || ''
    };
    this.clearMsg();
    this.showMilestoneModal.set(true);
  }
  saveMilestone() {
    if (!this.milestoneForm.milestoneType) { this.showError('Milestone name is required.'); return; }
    this.saving.set(true);
    const payload = { ...this.milestoneForm, notes: this.milestoneForm.notes || '', milestoneDate: this.milestoneForm.milestoneDate || null };
    const req = this.milestoneEditing ? this.api.updateMilestone(payload) : this.api.createMilestone(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showMilestoneModal.set(false);
        this.showSuccess(this.milestoneEditing ? 'Milestone updated.' : 'Milestone created.');
        this.fetchMilestones(this.selectedDossier().dossierId);
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || err?.error || 'Failed to save milestone.'); }
    });
  }

  // ── messages ──
  showSuccess(m: string) { this.successMsg.set(m); this.errorMsg.set(null); setTimeout(() => this.successMsg.set(null), 4000); }
  showError(m: string) { this.errorMsg.set(m); this.successMsg.set(null); setTimeout(() => this.errorMsg.set(null), 5000); }
  clearMsg() { this.errorMsg.set(null); this.successMsg.set(null); }
}
