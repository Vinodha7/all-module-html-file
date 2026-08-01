import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

/**
 * Electronic Signatures — Admin, READ ONLY.
 *
 * A traceability / compliance console only: it displays signatures created across
 * every business module (GET /pharmaTrack/identityAccess/signatures/all). Admins
 * can never sign, approve, reject, edit or delete here.
 *
 * Only real backend SignatureResponse fields are shown:
 *   signatureId, signerId, signerName, entityType, entityId, entityVersion,
 *   meaning, signedAt, signatureHash.
 * There is NO signatureMethod and NO workflow status in the backend, so neither
 * is displayed. KPI cards are derived from the real `meaning` values.
 */
@Component({
  selector: 'app-signatures-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <div class="page-head">
        <div>
          <h1 class="page-title">Electronic Signatures</h1>
          <div class="page-sub">Monitor electronic signatures across every signed record.</div>
        </div>
      </div>

      <div class="info-banner banner-danger" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="info-banner banner-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- Read-only notice -->
      <div class="info-banner">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div><strong>View only.</strong> Administrators can monitor signature status but cannot sign, approve, or reject an electronic signature on behalf of any user.</div>
      </div>

      <!-- KPI cards derived from real signature meaning values -->
      <div class="kpi-grid kpi-grid-6">
        <div class="kpi-card tone-neutral">
          <div class="kpi-top">
            <div class="kpi-label">Total Signatures</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M3 21h18"/></svg></div>
          </div>
          <div class="kpi-value">{{ total() }}</div>
        </div>
        <div class="kpi-card tone-accent">
          <div class="kpi-top">
            <div class="kpi-label">Approved Signatures</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg></div>
          </div>
          <div class="kpi-value">{{ approved() }}</div>
        </div>
        <div class="kpi-card tone-blue">
          <div class="kpi-top">
            <div class="kpi-label">Reviewed Signatures</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg></div>
          </div>
          <div class="kpi-value">{{ reviewed() }}</div>
        </div>
        <div class="kpi-card tone-warning">
          <div class="kpi-top">
            <div class="kpi-label">Released Signatures</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
          </div>
          <div class="kpi-value">{{ released() }}</div>
        </div>
        <div class="kpi-card tone-danger">
          <div class="kpi-top">
            <div class="kpi-label">Rejected Signatures</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg></div>
          </div>
          <div class="kpi-value">{{ rejected() }}</div>
        </div>
        <div class="kpi-card tone-neutral">
          <div class="kpi-top">
            <div class="kpi-label">Recent Signatures</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
          </div>
          <div class="kpi-value">{{ recent() }}</div>
          <div class="kpi-hint">last 30 days</div>
        </div>
      </div>

      <!-- Icon-only filters -->
      <div class="filter-bar">
        <div class="dropdown">
          <div class="tooltip-wrap">
            <button type="button" class="icon-filter" [class.active]="moduleFilter !== 'All'" aria-label="Filter by Module" (click)="toggleMenu('module')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            <span class="tooltip">Filter by Module</span>
          </div>
          <div class="dropdown-menu" [class.open]="openMenu() === 'module'">
            <button type="button" class="dropdown-item" (click)="setModule('All')">All Modules</button>
            <button type="button" class="dropdown-item" *ngFor="let m of SIGNATURE_MODULES" (click)="setModule(m.key)">{{ m.label }}</button>
          </div>
        </div>
        <span class="filter-chip" *ngIf="moduleFilter !== 'All'">{{ moduleLabelFor(moduleFilter) }}<button type="button" (click)="setModule('All')" aria-label="Clear module filter">×</button></span>

        <div class="dropdown">
          <div class="tooltip-wrap">
            <button type="button" class="icon-filter" [class.active]="meaningFilter !== 'All'" aria-label="Filter by Meaning" (click)="toggleMenu('meaning')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            <span class="tooltip">Filter by Meaning</span>
          </div>
          <div class="dropdown-menu" [class.open]="openMenu() === 'meaning'">
            <button type="button" class="dropdown-item" (click)="setMeaning('All')">All Meanings</button>
            <button type="button" class="dropdown-item" (click)="setMeaning('APPROVED')">Approved</button>
            <button type="button" class="dropdown-item" (click)="setMeaning('REVIEWED')">Reviewed</button>
            <button type="button" class="dropdown-item" (click)="setMeaning('REJECTED')">Rejected</button>
            <button type="button" class="dropdown-item" (click)="setMeaning('RELEASED')">Released</button>
          </div>
        </div>
        <span class="filter-chip" *ngIf="meaningFilter !== 'All'">{{ meaningLabel(meaningFilter) }}<button type="button" (click)="setMeaning('All')" aria-label="Clear meaning filter">×</button></span>

        <div class="date-filter" title="From Date">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <input type="date" [(ngModel)]="fromDate" (change)="applyFilters()" aria-label="From Date">
        </div>
        <div class="date-filter" title="To Date">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <input type="date" [(ngModel)]="toDate" (change)="applyFilters()" aria-label="To Date">
        </div>
      </div>

      <!-- Signature Records table -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>Signature Records <span class="count">· {{ filteredSignatures().length }} total</span></h3>
          <div class="dropdown">
            <button type="button" class="btn btn-outline" (click)="exportMenuOpen.set(!exportMenuOpen())">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="dropdown-menu dropdown-menu-right" [class.open]="exportMenuOpen()">
              <button type="button" class="dropdown-item" (click)="exportSignatures('pdf'); exportMenuOpen.set(false)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/></svg>
                Export as PDF
              </button>
              <button type="button" class="dropdown-item" (click)="exportSignatures('excel'); exportMenuOpen.set(false)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                Export as Excel
              </button>
            </div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <colgroup>
              <col style="width:22%"><col style="width:18%"><col style="width:16%"><col style="width:22%"><col style="width:18%"><col style="width:90px">
            </colgroup>
            <thead>
              <tr>
                <th>Entity Type</th>
                <th>Reference</th>
                <th>Meaning</th>
                <th>Signer</th>
                <th>Signed On</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sig of paginatedSignatures()">
                <td class="name-cell">{{ sig.entityType || '—' }}</td>
                <td>{{ sig.entityId || '—' }}</td>
                <td>
                  <span class="badge-status" [ngClass]="badgeClass(sig.meaning)">{{ sig.meaning || '—' }}</span>
                </td>
                <td>{{ sig.signerName || '—' }}</td>
                <td>{{ sig.signedAt ? (sig.signedAt | date:'MMM d, y HH:mm') : '—' }}</td>
                <td>
                  <button type="button" class="icon-menu-btn" title="View signature details" (click)="viewDetails(sig)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredSignatures().length === 0">
                <td colspan="6" class="empty-state">No electronic signatures found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer" *ngIf="filteredSignatures().length > 0">
          <div>Page {{ page() }} of {{ totalPages() }} · {{ filteredSignatures().length }} records</div>
          <div class="pager">
            <button type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)" title="Previous page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span style="padding:0 4px;">{{ page() }} / {{ totalPages() }}</span>
            <button type="button" [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" title="Next page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- SIGNATURE DETAILS MODAL — business-first; technical data in a collapsible section -->
      <div class="modal-overlay" *ngIf="selectedSignature() as s">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="closeDetails()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Signature Details</h2>

          <!-- Primary (business) details -->
          <div class="detail-grid">
            <div class="detail-field">
              <label>Signature ID</label>
              <div class="value mono">{{ s.signatureId }}</div>
            </div>
            <div class="detail-field">
              <label>Originating Module</label>
              <div class="value">{{ originatingModule(s.entityType) }}</div>
            </div>
            <div class="detail-field">
              <label>Entity Type</label>
              <div class="value">{{ entityTypeLabel(s.entityType) }}</div>
            </div>
            <div class="detail-field">
              <label>Business Reference</label>
              <div class="value">{{ s.entityId || '—' }}</div>
            </div>
            <div class="detail-field">
              <label>Meaning</label>
              <span class="badge-status" [ngClass]="badgeClass(s.meaning)">{{ s.meaning || '—' }}</span>
            </div>
            <div class="detail-field">
              <label>Signer Name</label>
              <div class="value">{{ s.signerName || '—' }}</div>
            </div>
            <div class="detail-field">
              <label>Signed Timestamp</label>
              <div class="value">{{ s.signedAt ? (s.signedAt | date:'dd-MMM-y HH:mm') : '—' }}</div>
            </div>
            <div class="detail-field">
              <label>Integrity Status</label>
              <div class="value integ-value" [ngClass]="'integ-' + selectedIntegrity()">
                <span *ngIf="selectedIntegrity() === 'loading'">Checking…</span>
                <span *ngIf="selectedIntegrity() === 'verified'">✅ Verified</span>
                <span *ngIf="selectedIntegrity() === 'tampered'">❌ Tampered</span>
                <span *ngIf="selectedIntegrity() === 'error'">⚠ Verification Error</span>
              </div>
            </div>
          </div>

          <!-- Advanced technical details (collapsed by default) -->
          <button type="button" class="advanced-toggle" (click)="advancedOpen.set(!advancedOpen())">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [style.transform]="advancedOpen() ? 'rotate(90deg)' : 'none'"><path d="m9 18 6-6-6-6"/></svg>
            Advanced Technical Details
          </button>
          <div class="advanced" *ngIf="advancedOpen()">
            <div class="detail-field">
              <label>Entity Version</label>
              <div class="value">{{ s.entityVersion || '—' }}</div>
            </div>
            <div class="detail-field detail-field-full">
              <label>Signature Hash</label>
              <div class="value mono hash-value">{{ s.signatureHash || '—' }}</div>
            </div>
          </div>

          <div class="info-banner" style="margin-top:20px;margin-bottom:0;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
            <div>This signature was completed by the signer named above. Administrators cannot sign, countersign, approve, reject, or alter signature records.</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Keep all six KPI cards on a single row (min-width:0 lets tracks shrink to fit). */
    .kpi-grid-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; }
    .kpi-grid-6 .kpi-card { padding: 16px 14px; min-width: 0; }
    .kpi-grid-6 .kpi-value { font-size: 26px; }
    .kpi-grid-6 .kpi-label { font-size: 12.5px; }
    .kpi-grid-6 .kpi-icon { width: 30px; height: 30px; }
    .kpi-hint { font-size: 11.5px; color: var(--text-dim); margin-top: -6px; }
    /* Icon-only filter bar (matches Audit Trail) */
    .filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .filter-bar .dropdown-menu { min-width: 250px; padding: 8px; }
    .filter-bar .dropdown-item { white-space: nowrap; justify-content: flex-start; padding: 9px 12px; }
    .icon-filter { width: 42px; height: 42px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #fff; color: var(--text-dim); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .icon-filter:hover { background: #f4f6f5; color: var(--text); }
    .icon-filter.active { border-color: var(--accent); color: var(--accent-dark); background: var(--accent-light); }
    .filter-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--accent-light); color: var(--accent-dark); font-size: 12.5px; font-weight: 600; padding: 6px 8px 6px 12px; border-radius: 18px; }
    .filter-chip button { border: none; background: none; color: var(--accent-dark); font-size: 15px; line-height: 1; cursor: pointer; padding: 0 2px; }
    .date-filter { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: #fff; padding: 0 12px; height: 42px; color: var(--text-dim); }
    .date-filter input { border: none; outline: none; font-family: inherit; font-size: 14px; color: var(--text); background: transparent; }
    /* Black hover tooltip (matches the Create User button tooltip). */
    .tooltip-wrap { position: relative; display: inline-flex; }
    .tooltip-wrap .tooltip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #211611; color: #fff; font-size: 12px; font-weight: 600; padding: 5px 9px; border-radius: 6px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .15s ease; z-index: 80; }
    .tooltip-wrap .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #211611; }
    .tooltip-wrap:hover .tooltip { opacity: 1; }
    .detail-field-full { grid-column: 1 / -1; }
    .hash-value { word-break: break-all; font-size: 13.5px; font-weight: 500; }
    /* Integrity status in the details modal */
    .integ-value { font-weight: 700; }
    .integ-value.integ-verified { color: var(--accent-dark); }
    .integ-value.integ-tampered { color: var(--danger); }
    .integ-value.integ-error, .integ-value.integ-loading { color: var(--warning); }
    /* Advanced technical details (collapsible) */
    .advanced-toggle { display: inline-flex; align-items: center; gap: 6px; margin: 22px 0 0; background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); }
    .advanced-toggle svg { transition: transform .15s ease; }
    .advanced { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 40px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border); }
    .empty-state { text-align: center; color: var(--text-dim); font-style: italic; padding: 28px !important; }
    .pager button:disabled { opacity: 0.45; cursor: not-allowed; }
    .info-banner.banner-danger { background: var(--danger-light); border-color: #f0bcbc; color: var(--danger); }
    .info-banner.banner-success { background: var(--accent-light); border-color: #f0c9a8; color: var(--accent-dark); }
  `]
})
export class SignaturesComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  signatures = signal<any[]>([]);
  filteredSignatures = signal<any[]>([]);

  // KPI cards
  total = signal<number>(0);
  approved = signal<number>(0);
  reviewed = signal<number>(0);
  released = signal<number>(0);
  rejected = signal<number>(0);
  recent = signal<number>(0);

  // All PharmaTrack modules that require electronic signatures, with the signable
  // entity types each one covers (from the backend signature authorization matrix).
  readonly SIGNATURE_MODULES: { key: string; label: string; entityTypes: string[] }[] = [
    { key: 'ClinicalTrial', label: 'Clinical Trial', entityTypes: ['TrialProtocol', 'ClinicalTrial', 'TrialSite'] },
    { key: 'SubjectEnrollment', label: 'Subject Enrollment', entityTypes: ['TrialSubject', 'VisitRecord', 'AdverseEvent'] },
    { key: 'BatchManufacturing', label: 'Batch Manufacturing', entityTypes: ['BatchRecord', 'QCTest', 'RawMaterialUsage'] },
    { key: 'SupplyChain', label: 'Supply Chain', entityTypes: ['DrugShipment', 'ColdChainLog', 'SiteInventory'] },
    { key: 'DeviationCAPA', label: 'Deviation & CAPA', entityTypes: ['DeviationRecord', 'CAPARecord'] },
    { key: 'RegulatoryAffairs', label: 'Regulatory Affairs', entityTypes: ['RegulatoryDossier', 'RegulatoryMilestone'] }
  ];

  // Filters
  moduleFilter = 'All';
  meaningFilter = 'All';
  fromDate = '';
  toDate = '';

  // Pagination
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  selectedSignature = signal<any>(null);
  exportMenuOpen = signal<boolean>(false);
  openMenu = signal<'module' | 'meaning' | null>(null);
  advancedOpen = signal<boolean>(false);
  selectedIntegrity = signal<'unknown' | 'loading' | 'verified' | 'tampered' | 'error'>('unknown');

  ngOnInit() {
    this.fetchSignatures();
  }

  private meaningKey(m: any): string {
    return (m || '').toString().trim().toUpperCase();
  }

  badgeClass(meaning: any): Record<string, boolean> {
    const k = this.meaningKey(meaning);
    return {
      'badge-approved': k === 'APPROVED',
      'badge-submitted': k === 'REVIEWED',
      'badge-progress': k === 'RELEASED',
      'badge-rejected': k === 'REJECTED'
    };
  }

  fetchSignatures() {
    this.apiService.getAllSignatures().subscribe({
      next: (res) => {
        if (res.success) {
          const list = res.data || [];
          this.signatures.set(list);
          this.computeKpis(list);
          this.applyFilters();
        }
      },
      error: (err) => this.showError(err.error?.message || 'Failed to load signatures.')
    });
  }

  private computeKpis(list: any[]) {
    this.total.set(list.length);
    this.approved.set(list.filter(s => this.meaningKey(s.meaning) === 'APPROVED').length);
    this.reviewed.set(list.filter(s => this.meaningKey(s.meaning) === 'REVIEWED').length);
    this.released.set(list.filter(s => this.meaningKey(s.meaning) === 'RELEASED').length);
    this.rejected.set(list.filter(s => this.meaningKey(s.meaning) === 'REJECTED').length);
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.recent.set(list.filter(s => s.signedAt && new Date(s.signedAt).getTime() >= cutoff).length);
  }

  toggleMenu(which: 'module' | 'meaning') { this.openMenu.set(this.openMenu() === which ? null : which); }
  setModule(key: string) { this.moduleFilter = key; this.openMenu.set(null); this.applyFilters(); }
  setMeaning(m: string) { this.meaningFilter = m; this.openMenu.set(null); this.applyFilters(); }
  moduleLabelFor(key: string): string { return this.SIGNATURE_MODULES.find(m => m.key === key)?.label || key; }
  meaningLabel(m: string): string { return m === 'All' ? 'All' : m.charAt(0).toUpperCase() + m.slice(1).toLowerCase(); }

  applyFilters() {
    let result = [...this.signatures()];
    if (this.moduleFilter !== 'All') {
      const mod = this.SIGNATURE_MODULES.find(m => m.key === this.moduleFilter);
      const types = mod ? mod.entityTypes : [this.moduleFilter];
      result = result.filter(s => s.entityType && types.includes(s.entityType));
    }
    if (this.meaningFilter !== 'All') {
      result = result.filter(s => this.meaningKey(s.meaning) === this.meaningFilter);
    }
    if (this.fromDate) {
      const from = new Date(`${this.fromDate}T00:00:00`).getTime();
      result = result.filter(s => s.signedAt && new Date(s.signedAt).getTime() >= from);
    }
    if (this.toDate) {
      const to = new Date(`${this.toDate}T23:59:59`).getTime();
      result = result.filter(s => s.signedAt && new Date(s.signedAt).getTime() <= to);
    }
    this.filteredSignatures.set(result);
    this.page.set(1);
    this.totalPages.set(Math.ceil(result.length / this.pageSize) || 1);
  }

  paginatedSignatures() {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredSignatures().slice(start, start + this.pageSize);
  }

  viewDetails(sig: any) {
    this.selectedSignature.set(sig);
    this.advancedOpen.set(false);
    this.loadIntegrity(sig);
  }

  closeDetails() {
    this.selectedSignature.set(null);
    this.advancedOpen.set(false);
    this.selectedIntegrity.set('unknown');
  }

  /** On-demand integrity check for the opened signature (real GET /verifySignatures). */
  private loadIntegrity(sig: any) {
    if (!sig?.entityType || !sig?.entityId) { this.selectedIntegrity.set('error'); return; }
    this.selectedIntegrity.set('loading');
    this.apiService.verifySignatures(sig.entityType, sig.entityId).subscribe({
      next: (res: any) => {
        const list = res?.data?.signatures || [];
        const match = list.find((r: any) => r.signatureId === sig.signatureId);
        if (!match) { this.selectedIntegrity.set('error'); return; }
        this.selectedIntegrity.set(match.valid ? 'verified' : 'tampered');
      },
      error: () => this.selectedIntegrity.set('error')
    });
  }

  /** Business module a signature belongs to, derived from its entity type. */
  originatingModule(entityType: string): string {
    if (!entityType) return '—';
    const mod = this.SIGNATURE_MODULES.find(m => m.entityTypes.includes(entityType));
    return mod ? mod.label : this.entityTypeLabel(entityType);
  }

  entityTypeLabel(t: string): string {
    if (!t) return '—';
    return t.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  }

  exportSignatures(format: 'pdf' | 'excel') {
    const list = this.filteredSignatures().map(s => ({
      'Signature ID': s.signatureId,
      'Entity Type': s.entityType ?? '',
      'Reference': s.entityId ?? '',
      'Entity Version': s.entityVersion ?? '',
      'Meaning': s.meaning ?? '',
      'Signer': s.signerName ?? '',
      'Signed On': s.signedAt ?? '',
      'Signature Hash': s.signatureHash ?? ''
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(list);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Signatures');
      XLSX.writeFile(wb, 'PharmaTrack_Signatures.xlsx');
      this.showSuccess('Signatures exported to Excel.');
    } else {
      const doc = new jsPDF('landscape');
      doc.text('PharmaTrack — Electronic Signatures (21 CFR Part 11)', 14, 15);
      const headers = [['ID', 'Entity Type', 'Reference', 'Ver.', 'Meaning', 'Signer', 'Signed On', 'Signature Hash']];
      const rows = list.map(s => [
        s['Signature ID'], s['Entity Type'], s['Reference'], s['Entity Version'],
        s['Meaning'], s['Signer'], s['Signed On'],
        (s['Signature Hash'] || '').toString().substring(0, 20) + (s['Signature Hash'] ? '…' : '')
      ]);
      (doc as any).autoTable({ head: headers, body: rows, startY: 22, theme: 'striped', headStyles: { fillColor: [206, 82, 0] } });
      doc.save('PharmaTrack_Signatures.pdf');
      this.showSuccess('Signatures exported to PDF.');
    }
  }

  showSuccess(msg: string) { this.successMsg.set(msg); this.errorMsg.set(null); setTimeout(() => this.successMsg.set(null), 4000); }
  showError(msg: string) { this.errorMsg.set(msg); this.successMsg.set(null); setTimeout(() => this.errorMsg.set(null), 5000); }
}
