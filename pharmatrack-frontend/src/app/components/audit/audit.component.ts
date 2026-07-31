import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-audit-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <!-- Page header -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Compliance & Audit Ledger</h1>
          <div class="page-sub">Keyed HMAC cryptographic audit log verification (21 CFR Part 11)</div>
        </div>
        <div class="actions-row">
          <button class="btn btn-primary" (click)="verifyIntegrity()" [disabled]="verifying()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
            {{ verifying() ? 'Verifying...' : 'Verify Integrity' }}
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid" style="grid-template-columns:repeat(6,1fr);">
        <div class="kpi-card tone-neutral">
          <div class="kpi-top">
            <div class="kpi-label">Total Audit Events</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg></div>
          </div>
          <div class="kpi-value">{{ kpis().total }}</div>
        </div>
        <div class="kpi-card tone-accent">
          <div class="kpi-top">
            <div class="kpi-label">Verified Events</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg></div>
          </div>
          <div class="kpi-value">{{ kpis().verified }}</div>
        </div>
        <div class="kpi-card tone-danger" [class.danger-highlight]="kpis().tampered > 0">
          <div class="kpi-top">
            <div class="kpi-label">Tampered Events</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><path d="M12 8v4M12 16h.01"/></svg></div>
          </div>
          <div class="kpi-value">{{ kpis().tampered }}</div>
        </div>
        <div class="kpi-card tone-warning">
          <div class="kpi-top">
            <div class="kpi-label">Verification Errors</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg></div>
          </div>
          <div class="kpi-value">{{ kpis().verificationErrors }}</div>
        </div>
        <div class="kpi-card tone-blue">
          <div class="kpi-top">
            <div class="kpi-label">Events Today</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
          </div>
          <div class="kpi-value">{{ kpis().today }}</div>
        </div>
        <div class="kpi-card tone-neutral">
          <div class="kpi-top">
            <div class="kpi-label">Active Modules</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg></div>
          </div>
          <div class="kpi-value">{{ kpis().activeModules }}</div>
        </div>
      </div>

      <!-- Status banners -->
      <div class="info-banner banner-danger" *ngIf="errorMsg()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <span>{{ errorMsg() }}</span>
      </div>
      <div class="info-banner banner-success" *ngIf="successMsg()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg>
        <span>{{ successMsg() }}</span>
      </div>

      <!-- INTEGRITY REPORT CARD -->
      <div class="integrity-report" *ngIf="integrityReport()">
        <div class="report-header" [class.report-intact]="integrityReport().intact" [class.report-tampered]="!integrityReport().intact">
          <h4>
            {{ integrityReport().intact ? 'Cryptographic Integrity Intact' : 'Warning: Ledger Tampering Detected' }}
          </h4>
          <span>Verified {{ integrityReport().total }} records.</span>
        </div>
        <div class="report-body">
          <div class="report-kpis">
            <div>Verified: <strong>{{ integrityReport().verified }}</strong></div>
            <div>Tampered: <strong [class.danger-text]="integrityReport().tampered > 0">{{ integrityReport().tampered }}</strong></div>
            <div>Unverifiable: <strong [class.danger-text]="integrityReport().unverifiable > 0">{{ integrityReport().unverifiable }}</strong></div>
          </div>
          <!-- Issues list -->
          <div class="issues-list" *ngIf="integrityReport().issues && integrityReport().issues.length > 0">
            <h5>Detected Issues:</h5>
            <ul>
              <li *ngFor="let issue of integrityReport().issues">
                <strong>Event ID:</strong> {{ issue.eventId }} —
                <strong>Reason:</strong> {{ issue.reason }}
                (Module: {{ issue.module }})
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Filters -->
      <div class="filter-row">
        <label class="filter-field">
          <span class="filter-label">Filter by Module</span>
          <select class="select" [(ngModel)]="moduleFilter" (change)="loadAuditLogs(0)">
            <option value="All">All</option>
            <option *ngFor="let m of activeModulesList()" [value]="m">{{ m }}</option>
          </select>
        </label>
        <label class="filter-field">
          <span class="filter-label">Filter by Action</span>
          <select class="select" [(ngModel)]="actionFilter" (change)="loadAuditLogs(0)">
            <option value="All">All</option>
            <option *ngFor="let a of actionsList()" [value]="a">{{ a }}</option>
          </select>
        </label>
      </div>

      <!-- Audit Table -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>Audit Events <span class="count">· {{ auditLogs().length }} shown</span></h3>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Module</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Performed By</th>
                <th>Description</th>
                <th>HMAC Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let evt of auditLogs()">
                <td class="mono">{{ evt.performedAt | date:'medium' }}</td>
                <td class="tag">{{ evt.module }}</td>
                <td class="name-cell">{{ evt.action }}</td>
                <td>{{ evt.entityType }} (Code: {{ evt.entityId }})</td>
                <td>{{ evt.performedBy }}</td>
                <td>{{ evt.description }}</td>
                <td>
                  <span class="badge-status" [class.badge-active]="evt.integrityVerified" [class.badge-rejected]="!evt.integrityVerified">
                    {{ evt.integrityVerified ? 'VERIFIED' : 'UNVERIFIED' }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="auditLogs().length === 0">
                <td colspan="7" class="empty-state">No audit logs registered.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="auditLogs().length > 0">
          <div>Page {{ page() + 1 }} of {{ totalPages() }}</div>
          <div class="pager">
            <button [disabled]="page() === 0" (click)="changePage(page() - 1)" aria-label="Previous page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span style="padding:0 4px;">{{ page() + 1 }} / {{ totalPages() }}</span>
            <button [disabled]="page() >= totalPages() - 1" (click)="changePage(page() + 1)" aria-label="Next page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .danger-highlight { box-shadow: 0 0 0 1px var(--danger); }

    .filter-field { display: flex; flex-direction: column; gap: 6px; }
    .filter-label { font-size: 12px; font-weight: 600; color: var(--text-dim); }
    .filter-field .select { min-width: 200px; }

    .info-banner.banner-danger {
      background: var(--danger-light); border-color: #f0bcbc; color: var(--danger);
    }
    .info-banner.banner-danger svg { color: var(--danger); }
    .info-banner.banner-success {
      background: var(--accent-light); border-color: #f0c9a8; color: var(--accent-dark);
    }
    .info-banner.banner-success svg { color: var(--accent-dark); }

    .integrity-report {
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      margin-bottom: 24px;
      overflow: hidden;
      background: var(--card);
    }
    .report-header {
      padding: 14px 20px; color: #ffffff;
      display: flex; justify-content: space-between; align-items: center;
    }
    .report-intact { background: var(--accent-dark); }
    .report-tampered { background: var(--danger); }
    .report-header h4 { margin: 0; font-size: 15px; font-weight: 700; }
    .report-header span { font-size: 13px; }
    .report-body { padding: 20px; }
    .report-kpis { display: flex; gap: 24px; font-size: 14px; margin-bottom: 16px; }
    .danger-text { color: var(--danger); }
    .issues-list { border-top: 1px solid var(--border); padding-top: 14px; }
    .issues-list h5 { margin: 0 0 10px; font-size: 14px; color: var(--danger); }
    .issues-list ul { margin: 0; padding-left: 20px; font-size: 13.5px; color: var(--text); }

    .empty-state {
      text-align: center; color: var(--text-dim);
      font-style: italic; padding: 24px !important;
    }
    .pager button:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class AuditComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  kpis = signal<any>({
    total: 0,
    verified: 0,
    tampered: 0,
    verificationErrors: 0,
    today: 0,
    activeModules: 0
  });

  integrityReport = signal<any | null>(null);

  // Filters
  moduleFilter = 'All';
  actionFilter = 'All';

  activeModulesList = signal<string[]>([]);
  actionsList = signal<string[]>([]);

  // Logs list
  auditLogs = signal<any[]>([]);

  // Pagination
  page = signal<number>(0);
  pageSize = 10;
  totalPages = signal<number>(1);

  verifying = signal<boolean>(false);

  ngOnInit() {
    this.fetchSummary();
    this.loadAuditLogs();
  }

  fetchSummary() {
    this.apiService.getAuditSummary().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const s = res.data;
          // Count active modules from summary keys
          const activeModCount = s.moduleCounts ? Object.keys(s.moduleCounts).length : 0;
          const totalLogsCount = s.totalCount || 0;
          
          this.kpis.set({
            total: totalLogsCount,
            verified: totalLogsCount - (s.tamperedCount || 0),
            tampered: s.tamperedCount || 0,
            verificationErrors: s.verificationErrorCount || 0,
            today: s.todayCount || 0,
            activeModules: activeModCount
          });

          // Set list of active modules and actions for filters dropdown
          if (s.moduleCounts) {
            this.activeModulesList.set(Object.keys(s.moduleCounts));
          }
          if (s.actionCounts) {
            this.actionsList.set(Object.keys(s.actionCounts));
          }
        }
      }
    });
  }

  loadAuditLogs(pageIdx: number = this.page()) {
    this.page.set(pageIdx);
    const filterParams: any = {};
    if (this.moduleFilter !== 'All') filterParams.module = this.moduleFilter;
    if (this.actionFilter !== 'All') filterParams.action = this.actionFilter;

    this.apiService.getAuditEvents(pageIdx, this.pageSize, filterParams).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.auditLogs.set(res.data.content || []);
          this.totalPages.set(res.data.totalPages || 1);
        }
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching audit logs ledger')
    });
  }

  changePage(pageIdx: number) {
    this.loadAuditLogs(pageIdx);
  }

  verifyIntegrity() {
    this.verifying.set(true);
    this.integrityReport.set(null);
    this.clearMessages();

    this.apiService.verifyAuditLogIntegrity().subscribe({
      next: (res) => {
        this.verifying.set(false);
        if (res.success && res.data) {
          this.integrityReport.set(res.data);
          if (res.data.intact) {
            this.showSuccess('Ledger verification complete: Integrity intact.');
          } else {
            this.showError('Warning: Verification failed! Tampering detected.');
          }
          // Refresh list to show verified status update
          this.loadAuditLogs(0);
          this.fetchSummary();
        }
      },
      error: (err) => {
        this.verifying.set(false);
        this.showError(err.error?.message || 'Integrity verification failed to compile.');
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
