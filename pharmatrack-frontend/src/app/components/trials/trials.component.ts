import { Component, HostListener, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

/* ──────────────────────────────────────────────────────────────
   Clinical Trials — FRONTEND ONLY (no backend integration yet).
   Faithfully reproduces clinical-trials.html + view-trial.html:
   • same tooltips (.tooltip-wrap / .tooltip-bubble, hover-driven)
   • same dropdowns (click to toggle, click-outside to close)
   • pop-ups laid out so every field fits WITHOUT scrolling
   Data is held locally in signals; wiring to ApiService comes later.
   ────────────────────────────────────────────────────────────── */

interface Trial {
  trialCode: string; phase: string; indication: string; productId: string;
  planned: string; start: string; end: string; pi: string; status: string;
}
interface Protocol {
  id: string; trialId: string; version: string; status: string; date: string;
  inclusion: string; exclusion: string; endpoints: string;
}
interface Site {
  uid: string;          // local-only stable key; the site id is never shown in the UI
  siteMasterId: string; // maps the chosen site NAME back to the backend master site id
  trialId: string; name: string; country: string;
  pi: string; planned: string; status: string;
}

@Component({
  selector: 'app-clinical-trials',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ══════════════════════ LIST VIEW ══════════════════════ -->
    <div *ngIf="!selectedCode()">
      <div class="page-head">
        <div>
          <h1 class="page-title">Clinical Trials</h1>
          <div class="page-sub">Protocols, sites and phase milestones across trials</div>
        </div>
        <div class="tooltip-wrap" *ngIf="canCreateTrial()">
          <button class="btn btn-primary btn-create" (click)="openCreateTrial()" aria-label="Create Trial">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Trial
          </button>
          <span class="tooltip-bubble">Create Trial</span>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="kpi-grid">
        <div class="kpi-card tone-neutral">
          <div class="kpi-top"><div class="kpi-label">Total Trials</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div></div>
          <div class="kpi-value">{{ kpiTotal() }}</div>
        </div>
        <div class="kpi-card tone-accent">
          <div class="kpi-top"><div class="kpi-label">Active</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg></div></div>
          <div class="kpi-value">{{ kpiActive() }}</div>
        </div>
        <div class="kpi-card tone-neutral">
          <div class="kpi-top"><div class="kpi-label">Draft</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></div></div>
          <div class="kpi-value">{{ kpiDraft() }}</div>
        </div>
        <div class="kpi-card tone-blue">
          <div class="kpi-top"><div class="kpi-label">Completed</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></div></div>
          <div class="kpi-value">{{ kpiCompleted() }}</div>
        </div>
      </div>

      <!-- Filter row: search + two icon-only filters (Phase, Status) -->
      <div class="filter-row">
        <div class="input-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" placeholder="Search trial code or indication" [value]="search()" (input)="onSearch($event)">
        </div>

        <!-- Phase filter icon -->
        <div class="icon-filter">
          <button type="button" class="filter-trigger" [class.filtered]="phaseFilter() !== 'All Phases'" (click)="togglePhaseMenu($event)" aria-label="Filter by phase" title="Filter by phase">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="filter-menu" [class.open]="phaseMenuOpen()">
            <button type="button" *ngFor="let p of phaseOptions" [class.active]="phaseFilter() === p" (click)="setPhase(p)">{{ p }}</button>
          </div>
        </div>

        <!-- Status filter icon -->
        <div class="icon-filter">
          <button type="button" class="filter-trigger" [class.filtered]="statusFilter() !== 'All statuses'" (click)="toggleStatusMenu($event)" aria-label="Filter by status" title="Filter by status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="filter-menu" [class.open]="statusMenuOpen()">
            <button type="button" *ngFor="let s of statusOptions" [class.active]="statusFilter() === s" (click)="setStatus(s)">{{ s }}</button>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>All Trials <span class="count">· {{ filteredTrials().length }} total</span></h3>
          <div class="export-wrap">
            <button type="button" class="btn-ghost" (click)="toggleExportMenu($event)">
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
          <table>
            <thead>
              <tr><th>Trial Code</th><th>Phase</th><th>Indication</th><th>Planned</th><th>Status</th><th style="text-align:center;">Actions</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of paginatedTrials()">
                <td class="name-cell">{{ t.trialCode }}</td>
                <td class="tag">{{ t.phase }}</td>
                <td>{{ t.indication }}</td>
                <td class="mono">{{ t.planned }}</td>
                <td><span class="badge-status" [ngClass]="badgeClass(t.status)">{{ t.status }}</span></td>
                <td class="actions-cell">
                  <div class="dropdown">
                    <button class="icon-menu-btn" (click)="toggleDropdown('row-' + t.trialCode, $event)" aria-label="Row actions">
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right" [class.open]="openDropdown() === 'row-' + t.trialCode">
                      <button type="button" class="dropdown-item" (click)="openTrial(t.trialCode)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                      <button type="button" class="dropdown-item" *ngIf="canEditTrial()" (click)="openEditTrial(t)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredTrials().length === 0">
                <td colspan="6" class="empty-state">No clinical trials match your filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer" *ngIf="filteredTrials().length > 0">
          <span>Showing {{ paginatedTrials().length }} of {{ filteredTrials().length }} &middot; Page {{ page() }} of {{ totalPages() }}</span>
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

    <!-- ══════════════════════ DETAIL VIEW ══════════════════════ -->
    <div *ngIf="selectedCode() as code">
      <div class="breadcrumb"><a (click)="selectedCode.set(null)" style="cursor:pointer;">Trials</a> / <strong>{{ code }}</strong></div>

      <div class="view-card" *ngIf="selectedTrial() as t">
        <div class="detail-title-row">
          <div>
            <h1 class="page-title">{{ t.trialCode }}</h1>
            <div class="page-sub">{{ t.indication }} · {{ t.phase }}</div>
          </div>
          <span class="badge-status status-lg" [ngClass]="badgeClass(t.status)">{{ t.status }}</span>
        </div>

        <div class="trial-status-row">
          <div class="status-fields">
            <div class="detail-field"><label>Planned Subjects</label><div class="value">{{ t.planned }}</div></div>
            <div class="detail-field"><label>Start</label><div class="value">{{ t.start }}</div></div>
            <div class="detail-field"><label>End</label><div class="value">{{ t.end }}</div></div>
            <div class="detail-field"><label>Principal Investigator</label><div class="value">{{ userName(t.pi) }}</div></div>
          </div>
          <div class="detail-actions" *ngIf="canChangeStatus()">
            <!-- Workflow transition dropdown: appears once the trial has onward transitions -->
            <div class="wf-dropdown" *ngIf="transitionOptions().length">
              <button type="button" class="icon-action" (click)="toggleWfMenu($event)" aria-label="Change status" title="Change status">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="wf-menu" [class.open]="wfMenuOpen()">
                <button type="button" *ngFor="let s of transitionOptions()" (click)="setTrialStatus(s)">{{ s }}</button>
              </div>
            </div>
            <!-- Send: Draft → Active -->
            <div class="tooltip-wrap">
              <button type="button" class="icon-action send-icon" [disabled]="t.status !== 'Draft'" (click)="sendTrial()" aria-label="Send for activation">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
              <span class="tooltip-bubble">Send</span>
            </div>
          </div>
        </div>

        <!-- Protocols -->
        <div class="section-block">
          <div class="section-head">
            <h3>Protocols</h3>
            <div class="tooltip-wrap" *ngIf="canManage()">
              <button class="btn btn-primary btn-sm btn-create" (click)="openCreateProtocol()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Protocol
              </button>
              <span class="tooltip-bubble">Create Protocol</span>
            </div>
          </div>
          <div class="section-box">
            <table class="mini-table">
              <thead><tr><th>Version</th><th>Effective Date</th><th>Status</th><th class="actions-cell">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let p of trialProtocols()">
                  <td style="font-weight:700;">{{ p.version }}</td>
                  <td>{{ p.date }}</td>
                  <td><span class="badge-status" [ngClass]="badgeClass(p.status)">{{ p.status }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleDropdown('proto-' + p.id, $event)" aria-label="Protocol actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openDropdown() === 'proto-' + p.id" [class.drop-up]="dropUp() === 'proto-' + p.id">
                        <button type="button" class="dropdown-item" (click)="openViewProtocol(p)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" *ngIf="canManage()" (click)="openEditProtocol(p)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                        <button type="button" class="dropdown-item" *ngIf="canApproveProtocol() && p.status === 'Draft'" (click)="approveProtocol(p)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Approve</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="trialProtocols().length === 0"><td colspan="4" class="empty-state">No protocols defined for this trial yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sites -->
        <div class="section-block">
          <div class="section-head">
            <h3>Sites</h3>
            <div class="tooltip-wrap" *ngIf="canManage()">
              <button class="btn btn-primary btn-sm btn-create" (click)="openCreateSite()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Site
              </button>
              <span class="tooltip-bubble">Create Site</span>
            </div>
          </div>
          <div class="section-box">
            <table class="mini-table">
              <thead><tr><th>Site Name</th><th>Country</th><th>Status</th><th class="actions-cell">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of trialSites()">
                  <td style="font-weight:700;">{{ s.name }}</td>
                  <td>{{ s.country }}</td>
                  <td><span class="badge-status" [ngClass]="badgeClass(s.status)">{{ s.status }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleDropdown('site-' + s.uid, $event)" aria-label="Site actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openDropdown() === 'site-' + s.uid" [class.drop-up]="dropUp() === 'site-' + s.uid">
                        <button type="button" class="dropdown-item" (click)="openViewSite(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" *ngIf="canManage()" (click)="openEditSite(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="trialSites().length === 0"><td colspan="4" class="empty-state">No sites mapped to this trial yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════ MODALS ══════════════════════ -->

    <!-- CREATE TRIAL -->
    <div class="modal-overlay" *ngIf="activeModal() === 'createTrial'">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Create Trial</h2>
        <div class="modal-sub">Define trial phase, indication and planned enrolment</div>
        <div class="form-grid">
          <div class="field"><label>Trial Code<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.trialCode" placeholder="e.g. TRL-CARD-3" [class.invalid]="saveTried() && !trialForm.trialCode"></div>
          <div class="field"><label>Phase<span class="req">*</span></label><select [(ngModel)]="trialForm.phase"><option>Phase I</option><option>Phase II</option><option>Phase III</option><option>Phase IV</option></select></div>
          <div class="field"><label>Indication<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.indication" placeholder="e.g. Hypertension" [class.invalid]="saveTried() && !trialForm.indication"></div>
          <div class="field"><label>Product<span class="req">*</span></label>
            <select [(ngModel)]="trialForm.productId" [class.invalid]="saveTried() && !trialForm.productId">
              <option value="">Select a product</option>
              <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
            </select>
          </div>
          <div class="field"><label>Planned Subjects<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.planned" placeholder="e.g. 80" [class.invalid]="saveTried() && !trialForm.planned"></div>
          <div class="field"><label>Status<span class="req">*</span></label><select [(ngModel)]="trialForm.status"><option>Draft</option><option>Active</option><option>Suspended</option><option>Completed</option><option>Terminated</option></select></div>
          <div class="field"><label>Start Date<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.start" placeholder="dd-mm-yyyy" [class.invalid]="saveTried() && !trialForm.start"></div>
          <div class="field"><label>End Date<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.end" placeholder="dd-mm-yyyy" [class.invalid]="saveTried() && !trialForm.end"></div>
          <div class="field"><label>Principal Investigator<span class="req">*</span></label>
            <select [(ngModel)]="trialForm.pi" [class.invalid]="saveTried() && !trialForm.pi">
              <option value="">Select an investigator</option>
              <option *ngFor="let u of investigators()" [value]="u.userId">{{ u.name }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer"><span class="form-error" *ngIf="saveTried() && !trialValid()">Please fill all required fields.</span><button class="btn btn-primary" (click)="saveCreateTrial()">Save</button></div>
      </div>
    </div>

    <!-- EDIT TRIAL -->
    <div class="modal-overlay" *ngIf="activeModal() === 'editTrial'">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Edit Trial</h2>
        <div class="modal-sub">Define trial phase, indication and planned enrolment</div>
        <div class="form-grid">
          <div class="field"><label>Trial Code<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.trialCode" readonly></div>
          <div class="field"><label>Phase<span class="req">*</span></label><select [(ngModel)]="trialForm.phase"><option>Phase I</option><option>Phase II</option><option>Phase III</option><option>Phase IV</option></select></div>
          <div class="field"><label>Indication<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.indication" [class.invalid]="saveTried() && !trialForm.indication"></div>
          <div class="field"><label>Product<span class="req">*</span></label>
            <select [(ngModel)]="trialForm.productId" [class.invalid]="saveTried() && !trialForm.productId">
              <option value="">Select a product</option>
              <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
            </select>
          </div>
          <div class="field"><label>Planned Subjects<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.planned" [class.invalid]="saveTried() && !trialForm.planned"></div>
          <div class="field"><label>Status<span class="req">*</span></label><select [(ngModel)]="trialForm.status"><option>Draft</option><option>Active</option><option>Suspended</option><option>Completed</option><option>Terminated</option></select></div>
          <div class="field"><label>Start Date<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.start" [class.invalid]="saveTried() && !trialForm.start"></div>
          <div class="field"><label>End Date<span class="req">*</span></label><input type="text" [(ngModel)]="trialForm.end" [class.invalid]="saveTried() && !trialForm.end"></div>
          <div class="field"><label>Principal Investigator<span class="req">*</span></label>
            <select [(ngModel)]="trialForm.pi" [class.invalid]="saveTried() && !trialForm.pi">
              <option value="">Select an investigator</option>
              <option *ngFor="let u of investigators()" [value]="u.userId">{{ u.name }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer"><span class="form-error" *ngIf="saveTried() && !trialValid()">Please fill all required fields.</span><button class="btn btn-primary" (click)="saveEditTrial()">Save</button></div>
      </div>
    </div>

    <!-- CREATE PROTOCOL -->
    <div class="modal-overlay" *ngIf="activeModal() === 'createProtocol'">
      <div class="modal modal-lg">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Create Protocol</h2>
        <div class="modal-sub">Define protocol version, criteria and endpoints</div>
        <div class="form-grid">
          <div class="field"><label>Trial Code</label><input type="text" [value]="protocolForm.trialId" readonly></div>
          <div class="field"><label>Version Number<span class="req">*</span></label><input type="text" [(ngModel)]="protocolForm.version" placeholder="e.g. 1.0" [class.invalid]="saveTried() && !protocolForm.version"></div>
          <div class="field"><label>Status<span class="req">*</span></label><select [(ngModel)]="protocolForm.status"><option>Draft</option><option>Approved</option><option>Superseded</option></select></div>
          <div class="field"><label>Effective Date</label><input type="text" [(ngModel)]="protocolForm.date" placeholder="dd-mm-yyyy"></div>
          <div class="field full"><label>Inclusion Criteria<span class="req">*</span></label><textarea [(ngModel)]="protocolForm.inclusion" placeholder="e.g. Age 18-65, confirmed diagnosis..." [class.invalid]="saveTried() && !protocolForm.inclusion"></textarea></div>
          <div class="field full"><label>Exclusion Criteria<span class="req">*</span></label><textarea [(ngModel)]="protocolForm.exclusion" placeholder="e.g. Pregnant, chronic condition..." [class.invalid]="saveTried() && !protocolForm.exclusion"></textarea></div>
          <div class="field full"><label>Endpoints<span class="req">*</span></label><textarea [(ngModel)]="protocolForm.endpoints" placeholder="e.g. Primary and secondary endpoints" [class.invalid]="saveTried() && !protocolForm.endpoints"></textarea></div>
        </div>
        <div class="modal-footer"><span class="form-error" *ngIf="saveTried() && !protocolValid()">Please fill all required fields.</span><button class="btn btn-primary" (click)="saveCreateProtocol()">Save</button></div>
      </div>
    </div>

    <!-- VIEW PROTOCOL -->
    <div class="modal-overlay" *ngIf="activeModal() === 'viewProtocol'">
      <div class="modal modal-lg">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Protocol Details</h2>
        <div class="detail-grid">
          <div class="detail-field"><label>Protocol ID</label><div class="value">{{ protocolForm.id }}</div></div>
          <div class="detail-field"><label>Trial Code</label><div class="value">{{ protocolForm.trialId }}</div></div>
          <div class="detail-field"><label>Version Number</label><div class="value">{{ protocolForm.version }}</div></div>
          <div class="detail-field"><label>Status</label><span class="badge-status" [ngClass]="badgeClass(protocolForm.status)">{{ protocolForm.status }}</span></div>
          <div class="detail-field"><label>Effective Date</label><div class="value">{{ protocolForm.date }}</div></div>
        </div>
        <div class="detail-field" style="margin-top:16px;"><label>Inclusion Criteria</label><div class="value dim">{{ protocolForm.inclusion }}</div></div>
        <div class="detail-field" style="margin-top:12px;"><label>Exclusion Criteria</label><div class="value dim">{{ protocolForm.exclusion }}</div></div>
        <div class="detail-field" style="margin-top:12px;"><label>Endpoints</label><div class="value dim">{{ protocolForm.endpoints }}</div></div>
      </div>
    </div>

    <!-- EDIT PROTOCOL -->
    <div class="modal-overlay" *ngIf="activeModal() === 'editProtocol'">
      <div class="modal modal-lg">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Edit Protocol</h2>
        <div class="modal-sub">Update protocol version, criteria and endpoints</div>
        <div class="form-grid">
          <div class="field"><label>Trial Code</label><input type="text" [value]="protocolForm.trialId" readonly></div>
          <div class="field"><label>Version Number<span class="req">*</span></label><input type="text" [(ngModel)]="protocolForm.version" [class.invalid]="saveTried() && !protocolForm.version"></div>
          <div class="field"><label>Status<span class="req">*</span></label><select [(ngModel)]="protocolForm.status"><option>Draft</option><option>Approved</option><option>Superseded</option></select></div>
          <div class="field"><label>Effective Date</label><input type="text" [(ngModel)]="protocolForm.date"></div>
          <div class="field full"><label>Inclusion Criteria<span class="req">*</span></label><textarea [(ngModel)]="protocolForm.inclusion" [class.invalid]="saveTried() && !protocolForm.inclusion"></textarea></div>
          <div class="field full"><label>Exclusion Criteria<span class="req">*</span></label><textarea [(ngModel)]="protocolForm.exclusion" [class.invalid]="saveTried() && !protocolForm.exclusion"></textarea></div>
          <div class="field full"><label>Endpoints<span class="req">*</span></label><textarea [(ngModel)]="protocolForm.endpoints" [class.invalid]="saveTried() && !protocolForm.endpoints"></textarea></div>
        </div>
        <div class="modal-footer"><span class="form-error" *ngIf="saveTried() && !protocolValid()">Please fill all required fields.</span><button class="btn btn-primary" (click)="saveEditProtocol()">Save</button></div>
      </div>
    </div>

    <!-- CREATE SITE -->
    <div class="modal-overlay" *ngIf="activeModal() === 'createSite'">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Create Site</h2>
        <div class="modal-sub">Add a trial site and its enrolment plan</div>
        <div class="form-grid">
          <div class="field"><label>Site Name<span class="req">*</span></label>
            <select [(ngModel)]="siteForm.siteMasterId" (ngModelChange)="onSiteMasterChange()" [class.invalid]="saveTried() && !siteForm.siteMasterId">
              <option value="">Select a site</option>
              <option *ngFor="let ms of masterSites()" [value]="ms.siteId">{{ ms.siteName }}</option>
            </select>
          </div>
          <div class="field"><label>Country</label><input type="text" [value]="siteForm.country" placeholder="—" readonly></div>
          <div class="field"><label>Trial Code</label><input type="text" [value]="siteForm.trialId" readonly></div>
          <div class="field"><label>Status<span class="req">*</span></label><select [(ngModel)]="siteForm.status"><option>Active</option><option>On Hold</option><option>Closed</option></select></div>
          <div class="field"><label>Principal Investigator<span class="req">*</span></label>
            <select [(ngModel)]="siteForm.pi" [class.invalid]="saveTried() && !siteForm.pi">
              <option value="">Select an investigator</option>
              <option *ngFor="let u of investigators()" [value]="u.userId">{{ u.name }}</option>
            </select>
          </div>
          <div class="field"><label>Planned Subjects<span class="req">*</span></label><input type="text" [(ngModel)]="siteForm.planned" placeholder="e.g. 30" [class.invalid]="saveTried() && !siteForm.planned"></div>
        </div>
        <div class="modal-footer"><span class="form-error" *ngIf="saveTried() && !siteValid()">Please fill all required fields.</span><button class="btn btn-primary" (click)="saveCreateSite()">Save</button></div>
      </div>
    </div>

    <!-- VIEW SITE -->
    <div class="modal-overlay" *ngIf="activeModal() === 'viewSite'">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Site Details</h2>
        <div class="detail-grid">
          <div class="detail-field"><label>Site Name</label><div class="value">{{ siteForm.name }}</div></div>
          <div class="detail-field"><label>Trial Code</label><div class="value">{{ siteForm.trialId }}</div></div>
          <div class="detail-field"><label>Country</label><div class="value">{{ siteForm.country }}</div></div>
          <div class="detail-field"><label>Principal Investigator</label><div class="value">{{ userName(siteForm.pi) }}</div></div>
          <div class="detail-field"><label>Planned Subjects</label><div class="value">{{ siteForm.planned }}</div></div>
          <div class="detail-field"><label>Status</label><span class="badge-status" [ngClass]="badgeClass(siteForm.status)">{{ siteForm.status }}</span></div>
        </div>
      </div>
    </div>

    <!-- EDIT SITE -->
    <div class="modal-overlay" *ngIf="activeModal() === 'editSite'">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="closeModal()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Edit Site</h2>
        <div class="modal-sub">Update site details and enrolment plan</div>
        <div class="form-grid">
          <div class="field"><label>Site Name<span class="req">*</span></label>
            <select [(ngModel)]="siteForm.siteMasterId" (ngModelChange)="onSiteMasterChange()" [class.invalid]="saveTried() && !siteForm.siteMasterId">
              <option value="">Select a site</option>
              <option *ngFor="let ms of masterSites()" [value]="ms.siteId">{{ ms.siteName }}</option>
            </select>
          </div>
          <div class="field"><label>Country</label><input type="text" [value]="siteForm.country" readonly></div>
          <div class="field"><label>Trial Code</label><input type="text" [value]="siteForm.trialId" readonly></div>
          <div class="field"><label>Status<span class="req">*</span></label><select [(ngModel)]="siteForm.status"><option>Active</option><option>On Hold</option><option>Closed</option></select></div>
          <div class="field"><label>Principal Investigator<span class="req">*</span></label>
            <select [(ngModel)]="siteForm.pi" [class.invalid]="saveTried() && !siteForm.pi">
              <option value="">Select an investigator</option>
              <option *ngFor="let u of investigators()" [value]="u.userId">{{ u.name }}</option>
            </select>
          </div>
          <div class="field"><label>Planned Subjects<span class="req">*</span></label><input type="text" [(ngModel)]="siteForm.planned" [class.invalid]="saveTried() && !siteForm.planned"></div>
        </div>
        <div class="modal-footer"><span class="form-error" *ngIf="saveTried() && !siteValid()">Please fill all required fields.</span><button class="btn btn-primary" (click)="saveEditSite()">Save</button></div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Status badges not in the global design system ── */
    .badge-draft{background:var(--neutral-light,#eef0ef);color:var(--neutral-dark,#3c463f);}
    .badge-suspended{background:var(--warning-light);color:var(--warning);}
    .badge-completed{background:var(--blue-light);color:var(--blue);}
    .badge-terminated{background:var(--danger-light);color:var(--danger);}

    /* ── Tooltips: identical behaviour to the HTML (hover reveal) ── */
    .tooltip-wrap{position:relative;display:inline-flex;}
    .tooltip-wrap .tooltip-bubble{
      position:absolute;bottom:calc(100% + 10px);right:0;
      background:var(--text);color:#fff;font-size:12.5px;font-weight:600;
      padding:7px 12px;border-radius:7px;white-space:nowrap;
      opacity:0;pointer-events:none;transform:translateY(4px);
      transition:opacity .15s ease, transform .15s ease;z-index:40;
    }
    .tooltip-wrap .tooltip-bubble::after{content:'';position:absolute;top:100%;right:14px;border:6px solid transparent;border-top-color:var(--text);}
    .tooltip-wrap:hover .tooltip-bubble{opacity:1;transform:translateY(0);}

    .count{color:var(--text-dim);font-size:13.5px;font-weight:500;}
    td.actions-cell{text-align:center;position:relative;}

    /* ── Icon-only filters (Phase / Status) ── */
    .icon-filter{position:relative;}
    .filter-trigger{height:44px;padding:0 14px;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;color:var(--text-dim);cursor:pointer;}
    .filter-trigger:hover{background:#faf6f0;color:var(--text);}
    .filter-trigger.filtered{border-color:var(--accent);color:var(--accent);}
    .filter-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:60;min-width:180px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 14px 34px rgba(30,16,8,.16);padding:6px;display:none;}
    .filter-menu.open{display:block;}
    .filter-menu button{width:100%;text-align:left;background:none;border:none;padding:9px 11px;border-radius:7px;font-size:14px;cursor:pointer;color:var(--text);font-family:inherit;}
    .filter-menu button:hover{background:#f2f5f3;}
    .filter-menu button.active{background:var(--accent-light);color:var(--accent-dark);font-weight:700;}

    /* ── Export dropdown ── */
    .export-wrap{position:relative;}
    .btn-ghost{background:#fff;color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 14px;font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:inherit;}
    .btn-ghost:hover{background:#faf6f0;}
    .export-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:60;min-width:190px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 14px 34px rgba(30,16,8,.16);padding:6px;display:none;}
    .export-menu.open{display:block;}
    .export-menu button{width:100%;display:flex;align-items:center;gap:10px;background:none;border:none;padding:9px 11px;border-radius:7px;font-size:14px;cursor:pointer;color:var(--text);font-family:inherit;text-align:left;}
    .export-menu button:hover{background:#f2f5f3;}
    .export-menu button svg{flex-shrink:0;color:var(--text-dim);}

    /* ── Numbered pagination (matches Batch view) ── */
    .pager .page-num{width:auto;min-width:30px;height:30px;padding:0 8px;font-size:13.5px;font-weight:600;}
    .pager .page-num.active{background:var(--accent);color:#fff;border-color:var(--accent);}
    .pager button:disabled{opacity:.45;cursor:not-allowed;}

    /* ── Detail view: status badge at the far right of the title row ── */
    .detail-title-row{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:4px;}
    .status-lg{font-size:13.5px;padding:8px 16px;}
    .empty-state{padding:34px 20px;text-align:center;color:var(--text-dim);font-size:14px;font-style:italic;}

    /* ── Detail view ── */
    .view-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:32px 36px;}
    .breadcrumb a{color:var(--text-dim);text-decoration:none;}
    .breadcrumb a:hover{text-decoration:underline;}
    .breadcrumb strong{color:var(--text);font-weight:700;}
    .trial-status-row{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin:24px 0 6px;padding:20px 22px;background:#fbfaf8;border:1px solid var(--border);border-radius:var(--radius-md);}
    /* fields spread to fill the card width so there's no empty gap on the right;
       when the status controls are present they sit at the far right */
    .status-fields{display:flex;flex:1;gap:24px;flex-wrap:wrap;align-items:center;}
    .status-fields .detail-field{flex:1;min-width:110px;}
    /* tighter spacing between the + icon and the label on create buttons */
    .btn-create{gap:4px;}
    /* Workflow action controls (Send icon + transition dropdown) */
    .detail-actions{display:flex;align-items:center;gap:10px;margin-left:auto;}
    .icon-action{width:44px;height:44px;border-radius:var(--radius-md);border:1px solid var(--border);background:#fff;display:inline-flex;align-items:center;justify-content:center;color:var(--text-dim);cursor:pointer;}
    .icon-action:hover{background:#faf6f0;color:var(--text);}
    .icon-action:disabled{opacity:.4;cursor:not-allowed;}
    .icon-action:disabled:hover{background:#fff;color:var(--text-dim);}
    .send-icon{background:var(--accent);color:#fff;border-color:var(--accent);}
    .send-icon:hover{background:var(--accent-dark);color:#fff;}
    .send-icon:disabled:hover{background:var(--accent);color:#fff;}
    .wf-dropdown{position:relative;}
    .wf-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:60;min-width:160px;background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);box-shadow:0 14px 34px rgba(30,16,8,.16);padding:6px;display:none;}
    .wf-menu.open{display:block;}
    .wf-menu button{width:100%;text-align:left;background:none;border:none;padding:9px 11px;border-radius:7px;font-size:14px;cursor:pointer;color:var(--text);font-family:inherit;}
    .wf-menu button:hover{background:var(--accent-light);color:var(--accent-dark);}

    .section-block{margin-top:34px;}
    .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .section-head h3{margin:0;font-size:17px;font-weight:800;}
    .btn-sm{padding:8px 14px;font-size:13px;}
    /* overflow visible so a row's View/Edit menu is never clipped by the card;
       the page itself scrolls (scrollbar hidden globally) to reveal it if needed */
    .section-box{border:1px solid var(--border);border-radius:var(--radius-md);overflow:visible;}
    .mini-table{width:100%;border-collapse:collapse;}
    .mini-table thead tr th:first-child{border-top-left-radius:var(--radius-md);}
    .mini-table thead tr th:last-child{border-top-right-radius:var(--radius-md);}
    .mini-table tbody tr:last-child td:first-child{border-bottom-left-radius:var(--radius-md);}
    .mini-table tbody tr:last-child td:last-child{border-bottom-right-radius:var(--radius-md);}
    .mini-table th{text-align:left;padding:12px 18px;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--text-dim);text-transform:uppercase;background:#fbfaf8;border-bottom:1px solid var(--border);}
    .mini-table td{padding:14px 18px;font-size:14.5px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle;}
    .mini-table tr:last-child td{border-bottom:none;}
    .mini-table td.actions-cell,.mini-table th.actions-cell{text-align:center;width:56px;}

    /* Row-action menu can flip up near the viewport bottom (as in the HTML) */
    .dropdown-menu.drop-up{top:auto;bottom:calc(100% + 8px);}

    /* ══ POP-UPS: compact layout so every field fits with NO scroll ══ */
    .modal{max-width:820px;padding:26px 30px;max-height:none;overflow:visible;}
    .modal.modal-lg{max-width:1000px;}
    .modal h2{margin:0 0 3px 0;font-size:20px;font-weight:800;}
    .modal-sub{color:var(--text-dim);font-size:13.5px;margin:0 0 18px 0;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px 26px;margin-bottom:4px;}
    .field.full{grid-column:1 / -1;}
    .field label{display:block;font-size:13px;font-weight:700;margin-bottom:6px;}
    .field label .req{color:var(--danger);margin-left:2px;}
    .field input,.field select,.field textarea{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:#fff;color:var(--text);}
    .field textarea{resize:vertical;min-height:52px;}
    .field input::placeholder,.field textarea::placeholder{color:#a7b0aa;}
    .field input[readonly]{background:#f4f6f5;color:var(--text-dim);}
    .field input.invalid,.field select.invalid,.field textarea.invalid{border-color:var(--danger);background:#fff;}
    .form-error{color:var(--danger);font-size:13px;font-weight:600;margin-right:auto;align-self:center;}
    .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 36px;margin-bottom:4px;}
    .detail-field label{display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;color:var(--text-dim);text-transform:uppercase;margin-bottom:7px;}
    .detail-field .value{font-size:16px;font-weight:600;color:var(--text);}
    .detail-field .value.dim{color:var(--text-dim);font-weight:500;line-height:1.5;}
    .modal-footer{display:flex;justify-content:flex-end;margin-top:18px;}
  `]
})
export class TrialsComponent {
  private auth = inject(AuthService);
  private api = inject(ApiService);

  /* ── role-based access (frontend gating), per the Role Permissions screen ──
     Clinical Researcher: view + create/edit Trial + create/edit Protocol + create/edit Site
     Principal Investigator: view + change Trial status + Approve Protocol (Draft→Approved)
     both roles can view everything */
  role = computed(() => this.auth.normalizedRole());
  canCreateTrial = computed(() => this.role() === 'Researcher');
  canEditTrial = computed(() => this.role() === 'Researcher');
  canChangeStatus = computed(() => this.role() === 'Investigator');    // trial status transitions
  canManage = computed(() => this.role() === 'Researcher');            // create/edit protocols & sites
  canApproveProtocol = computed(() => this.role() === 'Investigator'); // protocol Draft → Approved

  /* reference directories (created by admin) — power the NAME dropdowns.
     the end user only ever sees names; the backend id is mapped behind the scenes */
  masterSites = signal<any[]>([]);
  products = signal<any[]>([]);
  users = signal<any[]>([]);
  /* only users whose role is Principal Investigator can be selected as a trial/site PI */
  investigators = computed(() => this.users().filter(u =>
    String(u.role || '').toLowerCase().replace(/[^a-z]/g, '').includes('investigator')));

  constructor() {
    this.api.getSites().subscribe({ next: (r: any) => { if (r?.success) this.masterSites.set(r.data || []); }, error: () => {} });
    this.api.getProducts().subscribe({ next: (r: any) => { if (r?.success) this.products.set(r.data || []); }, error: () => {} });
    this.api.getUsers().subscribe({ next: (r: any) => { if (r?.success) this.users.set(r.data || []); }, error: () => {} });
  }

  productName(id: any): string {
    const p = this.products().find(x => String(x.productId) === String(id));
    return p ? p.productName : (id ? String(id) : '—');
  }
  userName(id: any): string {
    const u = this.users().find(x => String(x.userId) === String(id));
    return u ? u.name : (id ? String(id) : '—');
  }

  /* ── filter options ── */
  phaseOptions = ['All Phases', 'Phase I', 'Phase II', 'Phase III', 'Phase IV'];
  statusOptions = ['All statuses', 'Draft', 'Active', 'Suspended', 'Completed', 'Terminated'];

  /* ── local data (front-end only) ── */
  trials = signal<Trial[]>([
    { trialCode: 'TRL-SMOKE-1', phase: 'Phase II', indication: 'Smoke Test', productId: '1', planned: '50', start: '01-08-2026', end: '01-08-2027', pi: '1', status: 'Active' },
    { trialCode: 'TRL-DIAB-2', phase: 'Phase III', indication: 'Diabetes Type 2', productId: '2', planned: '120', start: '15-09-2026', end: '15-09-2028', pi: '2', status: 'Draft' },
    { trialCode: 'TRL-CARD-3', phase: 'Phase I', indication: 'Hypertension', productId: '3', planned: '80', start: '05-03-2026', end: '05-03-2027', pi: '3', status: 'Active' },
    { trialCode: 'TRL-ONCO-4', phase: 'Phase III', indication: 'Breast Cancer', productId: '4', planned: '240', start: '12-01-2026', end: '12-01-2029', pi: '4', status: 'Suspended' },
    { trialCode: 'TRL-NEURO-5', phase: 'Phase II', indication: "Alzheimer's Disease", productId: '5', planned: '160', start: '20-11-2025', end: '20-11-2027', pi: '2', status: 'Completed' },
    { trialCode: 'TRL-RESP-6', phase: 'Phase IV', indication: 'Asthma', productId: '6', planned: '300', start: '02-02-2026', end: '02-02-2028', pi: '5', status: 'Active' },
    { trialCode: 'TRL-IMMU-7', phase: 'Phase I', indication: 'Rheumatoid Arthritis', productId: '7', planned: '45', start: '18-04-2026', end: '18-04-2027', pi: '3', status: 'Draft' },
    { trialCode: 'TRL-CARD-8', phase: 'Phase II', indication: 'Atrial Fibrillation', productId: '3', planned: '90', start: '09-06-2026', end: '09-06-2028', pi: '4', status: 'Terminated' },
    { trialCode: 'TRL-DERM-9', phase: 'Phase III', indication: 'Psoriasis', productId: '8', planned: '175', start: '27-07-2026', end: '27-07-2028', pi: '6', status: 'Active' },
    { trialCode: 'TRL-GAST-10', phase: 'Phase II', indication: "Crohn's Disease", productId: '9', planned: '110', start: '14-05-2026', end: '14-05-2028', pi: '2', status: 'Draft' },
    { trialCode: 'TRL-ENDO-11', phase: 'Phase IV', indication: 'Thyroid Disorder', productId: '10', planned: '260', start: '30-09-2025', end: '30-09-2027', pi: '5', status: 'Completed' },
    { trialCode: 'TRL-OPHT-12', phase: 'Phase I', indication: 'Glaucoma', productId: '11', planned: '60', start: '22-08-2026', end: '22-08-2027', pi: '6', status: 'Active' }
  ]);

  protocols = signal<Protocol[]>([
    { id: 'PROTO-1001', trialId: 'TRL-SMOKE-1', version: '1.0', status: 'Approved', date: '01-08-2026',
      inclusion: 'Age 18-65, history of smoking for more than one year, willing to attempt cessation.',
      exclusion: 'Pregnant or nursing, chronic respiratory disease, currently using other cessation aids.',
      endpoints: 'Reduction in nicotine dependence score at 12 weeks (primary); quit rate at 24 weeks (secondary).' },
    { id: 'PROTO-1002', trialId: 'TRL-SMOKE-1', version: '1.1', status: 'Draft', date: '—',
      inclusion: 'Age 18-70, confirmed diagnosis of Type 2 Diabetes, HbA1c between 7% and 10%.',
      exclusion: 'Type 1 diabetes, severe renal impairment, recent cardiovascular event.',
      endpoints: 'Change in HbA1c from baseline to week 26 (primary); weight change (secondary).' }
  ]);

  sites = signal<Site[]>([
    { uid: 's1', siteMasterId: '', trialId: 'TRL-SMOKE-1', name: 'Apollo Research Center', country: 'India', pi: '1', planned: '25', status: 'Active' },
    { uid: 's2', siteMasterId: '', trialId: 'TRL-SMOKE-1', name: 'Mayo Clinical Site', country: 'United States', pi: '3', planned: '35', status: 'On Hold' }
  ]);

  /* ── ui state ── */
  search = signal('');
  phaseFilter = signal('All Phases');
  statusFilter = signal('All statuses');
  selectedCode = signal<string | null>(null);
  openDropdown = signal<string | null>(null);
  dropUp = signal<string | null>(null);
  activeModal = signal<string | null>(null);
  saveTried = signal(false); // becomes true after a Save click; drives required-field validation

  // icon-filter + export menus
  phaseMenuOpen = signal(false);
  statusMenuOpen = signal(false);
  exportMenuOpen = signal(false);
  wfMenuOpen = signal(false);

  // pagination
  page = signal(1);
  pageSize = 10;

  /* ── derived ── */
  filteredTrials = computed(() => {
    const q = this.search().trim().toLowerCase();
    const ph = this.phaseFilter();
    const st = this.statusFilter();
    return this.trials().filter(t => {
      const matchesSearch = !q || t.trialCode.toLowerCase().includes(q) || t.indication.toLowerCase().includes(q);
      const matchesPhase = ph === 'All Phases' || t.phase === ph;
      const matchesStatus = st === 'All statuses' || t.status === st;
      return matchesSearch && matchesPhase && matchesStatus;
    });
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredTrials().length / this.pageSize)));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  paginatedTrials = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredTrials().slice(start, start + this.pageSize);
  });

  kpiTotal = computed(() => this.trials().length);
  kpiActive = computed(() => this.trials().filter(t => t.status === 'Active').length);
  kpiDraft = computed(() => this.trials().filter(t => t.status === 'Draft').length);
  kpiCompleted = computed(() => this.trials().filter(t => t.status === 'Completed').length);

  selectedTrial = computed(() => this.trials().find(t => t.trialCode === this.selectedCode()) ?? null);
  trialProtocols = computed(() => this.protocols().filter(p => p.trialId === this.selectedCode()));
  trialSites = computed(() => this.sites().filter(s => s.trialId === this.selectedCode()));

  /* ── form models ── */
  trialForm: Trial = this.blankTrial();
  protocolForm: Protocol = this.blankProtocol();
  siteForm: Site = this.blankSite();

  /* ══ dropdown behaviour (matches the HTML) ══ */
  toggleDropdown(id: string, evt: Event) {
    evt.stopPropagation();
    this.dropUp.set(null); // action menus always open downward
    if (this.openDropdown() === id) {
      this.openDropdown.set(null);
      return;
    }
    this.phaseMenuOpen.set(false);
    this.statusMenuOpen.set(false);
    this.exportMenuOpen.set(false);
    this.wfMenuOpen.set(false);
    this.openDropdown.set(id);
  }

  @HostListener('document:click')
  closeDropdowns() {
    this.openDropdown.set(null);
    this.dropUp.set(null);
    this.phaseMenuOpen.set(false);
    this.statusMenuOpen.set(false);
    this.exportMenuOpen.set(false);
    this.wfMenuOpen.set(false);
  }

  /* ══ icon filters + export menus ══ */
  private closeAllMenus() {
    this.openDropdown.set(null);
    this.phaseMenuOpen.set(false);
    this.statusMenuOpen.set(false);
    this.exportMenuOpen.set(false);
    this.wfMenuOpen.set(false);
  }
  togglePhaseMenu(evt: Event) { evt.stopPropagation(); const v = this.phaseMenuOpen(); this.closeAllMenus(); this.phaseMenuOpen.set(!v); }
  toggleStatusMenu(evt: Event) { evt.stopPropagation(); const v = this.statusMenuOpen(); this.closeAllMenus(); this.statusMenuOpen.set(!v); }
  toggleExportMenu(evt: Event) { evt.stopPropagation(); const v = this.exportMenuOpen(); this.closeAllMenus(); this.exportMenuOpen.set(!v); }

  onSearch(evt: Event) { this.search.set((evt.target as HTMLInputElement).value); this.page.set(1); }
  setPhase(p: string) { this.phaseFilter.set(p); this.phaseMenuOpen.set(false); this.page.set(1); }
  setStatus(s: string) { this.statusFilter.set(s); this.statusMenuOpen.set(false); this.page.set(1); }

  /* ══ export current (filtered) trials to PDF / Excel ══ */
  exportData(type: 'pdf' | 'excel') {
    this.exportMenuOpen.set(false);
    const rows = this.filteredTrials().map(t => ({
      'Trial Code': t.trialCode,
      Phase: t.phase,
      Indication: t.indication,
      Planned: t.planned,
      Status: t.status
    }));

    if (type === 'excel') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Trials');
      XLSX.writeFile(wb, 'PharmaTrack_Trials.xlsx');
    } else {
      const doc = new jsPDF();
      doc.text('PharmaTrack — Clinical Trials', 14, 15);
      autoTable(doc, {
        head: [['Trial Code', 'Phase', 'Indication', 'Planned', 'Status']],
        body: rows.map(r => [r['Trial Code'], r.Phase, r.Indication, r.Planned, r.Status]),
        startY: 22,
        theme: 'striped',
        headStyles: { fillColor: [206, 82, 0] }
      });
      doc.save('PharmaTrack_Trials.pdf');
    }
  }

  /* ══ generic modal helpers ══ */
  openModal(id: string) { this.openDropdown.set(null); this.saveTried.set(false); this.activeModal.set(id); }

  /* ══ required-field validation (frontend) ══ */
  private notEmpty(v: any): boolean { return !!(v !== null && v !== undefined && String(v).trim()); }
  trialValid(): boolean {
    const f = this.trialForm;
    return this.notEmpty(f.trialCode) && this.notEmpty(f.phase) && this.notEmpty(f.indication) &&
      this.notEmpty(f.productId) && this.notEmpty(f.planned) && this.notEmpty(f.status) &&
      this.notEmpty(f.start) && this.notEmpty(f.end) && this.notEmpty(f.pi);
  }
  protocolValid(): boolean {
    const f = this.protocolForm;
    return this.notEmpty(f.version) && this.notEmpty(f.status) && this.notEmpty(f.inclusion) &&
      this.notEmpty(f.exclusion) && this.notEmpty(f.endpoints);
  }
  siteValid(): boolean {
    const f = this.siteForm;
    return this.notEmpty(f.siteMasterId) && this.notEmpty(f.pi) &&
      this.notEmpty(f.planned) && this.notEmpty(f.status);
  }
  closeModal() { this.activeModal.set(null); }

  /* ══ navigation ══ */
  openTrial(code: string) { this.openDropdown.set(null); this.selectedCode.set(code); }

  /* ══ workflow transitions (detail view) ══
     Draft --Send--> Active
     Active   -> { Suspended, Completed, Terminated }
     Suspended -> { Active, Terminated }
     Completed / Terminated are terminal (no dropdown) */
  transitionOptions = computed<string[]>(() => {
    switch (this.selectedTrial()?.status) {
      case 'Active': return ['Suspended', 'Completed', 'Terminated'];
      case 'Suspended': return ['Active', 'Terminated'];
      default: return [];
    }
  });
  toggleWfMenu(evt: Event) { evt.stopPropagation(); const v = this.wfMenuOpen(); this.closeAllMenus(); this.wfMenuOpen.set(!v); }
  sendTrial() { if (this.selectedTrial()?.status === 'Draft') this.setTrialStatus('Active'); }
  setTrialStatus(status: string) {
    this.wfMenuOpen.set(false);
    const code = this.selectedCode();
    if (!code) return;
    this.trials.update(list => list.map(t => t.trialCode === code ? { ...t, status } : t));
  }

  /* ══ TRIAL create / edit ══ */
  openCreateTrial() { this.trialForm = this.blankTrial(); this.openModal('createTrial'); }
  saveCreateTrial() {
    this.saveTried.set(true);
    if (!this.trialValid()) return;
    this.trials.update(list => [...list, { ...this.trialForm }]);
    this.closeModal();
  }
  openEditTrial(t: Trial) { this.trialForm = { ...t }; this.openModal('editTrial'); }
  saveEditTrial() {
    this.saveTried.set(true);
    if (!this.trialValid()) return;
    this.trials.update(list => list.map(t => t.trialCode === this.trialForm.trialCode ? { ...this.trialForm } : t));
    this.closeModal();
  }

  /* ══ PROTOCOL create / view / edit ══ */
  openCreateProtocol() {
    this.protocolForm = this.blankProtocol();
    this.protocolForm.id = this.nextId('PROTO-', this.protocols().map(p => p.id), 1001);
    this.protocolForm.trialId = this.selectedCode() ?? '';
    this.openModal('createProtocol');
  }
  saveCreateProtocol() {
    this.saveTried.set(true);
    if (!this.protocolValid()) return;
    this.protocols.update(list => [...list, { ...this.protocolForm }]);
    this.closeModal();
  }
  openViewProtocol(p: Protocol) { this.protocolForm = { ...p }; this.openModal('viewProtocol'); }
  openEditProtocol(p: Protocol) { this.protocolForm = { ...p }; this.openModal('editProtocol'); }
  approveProtocol(p: Protocol) {
    this.openDropdown.set(null);
    this.protocols.update(list => list.map(x => x.id === p.id ? { ...x, status: 'Approved' } : x));
  }
  saveEditProtocol() {
    this.saveTried.set(true);
    if (!this.protocolValid()) return;
    this.protocols.update(list => list.map(p => p.id === this.protocolForm.id ? { ...this.protocolForm } : p));
    this.closeModal();
  }

  /* ══ SITE create / view / edit ══ */
  openCreateSite() {
    this.siteForm = this.blankSite();
    this.siteForm.trialId = this.selectedCode() ?? '';
    this.openModal('createSite');
  }
  // Selecting a site name fills in the (read-only) country and maps to the backend id
  onSiteMasterChange() {
    const sel = this.masterSites().find(s => String(s.siteId) === String(this.siteForm.siteMasterId));
    this.siteForm.name = sel ? sel.siteName : '';
    this.siteForm.country = sel ? sel.country : '';
  }
  saveCreateSite() {
    this.saveTried.set(true);
    if (!this.siteValid()) return;
    this.sites.update(list => [...list, { ...this.siteForm, uid: 'site-' + Math.random().toString(36).slice(2, 9) }]);
    this.closeModal();
  }
  openViewSite(s: Site) { this.siteForm = { ...s }; this.openModal('viewSite'); }
  openEditSite(s: Site) { this.siteForm = { ...s }; this.openModal('editSite'); }
  saveEditSite() {
    this.saveTried.set(true);
    if (!this.siteValid()) return;
    this.sites.update(list => list.map(s => s.uid === this.siteForm.uid ? { ...this.siteForm } : s));
    this.closeModal();
  }

  /* ══ helpers ══ */
  badgeClass(status: string): string {
    switch (status) {
      case 'Active': return 'badge-active';
      case 'Approved': return 'badge-approved';
      case 'Draft': return 'badge-draft';
      case 'Suspended': return 'badge-suspended';
      case 'Completed': return 'badge-completed';
      case 'Terminated': return 'badge-terminated';
      case 'On Hold': case 'OnHold': return 'badge-progress';
      case 'Closed': return 'badge-terminated';
      case 'Superseded': return 'badge-draft';
      default: return 'badge-draft';
    }
  }

  private nextId(prefix: string, existing: string[], base: number): string {
    let max = base - 1;
    existing.forEach(id => {
      const n = parseInt(id.replace(prefix, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return prefix + (max + 1);
  }

  private blankTrial(): Trial {
    return { trialCode: '', phase: 'Phase I', indication: '', productId: '', planned: '', start: '', end: '', pi: '', status: 'Draft' };
  }
  private blankProtocol(): Protocol {
    return { id: '', trialId: '', version: '', status: 'Draft', date: '', inclusion: '', exclusion: '', endpoints: '' };
  }
  private blankSite(): Site {
    return { uid: '', siteMasterId: '', trialId: '', name: '', country: '', pi: '', planned: '', status: 'Active' };
  }
}
