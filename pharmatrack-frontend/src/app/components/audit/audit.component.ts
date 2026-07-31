import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-audit-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="audit-container">
      <div class="audit-header">
        <div>
          <h2>Compliance & Audit Ledger</h2>
          <p>Keyed HMAC Cryptographic Audit Log Verification (21 CFR Part 11)</p>
        </div>
        <div>
          <button class="btn btn-primary" (click)="verifyIntegrity()" [disabled]="verifying()">
            🛡️ {{ verifying() ? 'Verifying...' : 'Verify Integrity' }}
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon blue-bg">📊</div>
          <div>
            <div class="kpi-val">{{ kpis().total }}</div>
            <div class="kpi-label">Total Audit Events</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon green-bg">✓</div>
          <div>
            <div class="kpi-val">{{ kpis().verified }}</div>
            <div class="kpi-label">Verified Events</div>
          </div>
        </div>
        <div class="kpi-card" [class.danger-highlight]="kpis().tampered > 0">
          <div class="kpi-icon red-bg">⚠️</div>
          <div>
            <div class="kpi-val">{{ kpis().tampered }}</div>
            <div class="kpi-label">Tampered Events</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon orange-bg">⚡</div>
          <div>
            <div class="kpi-val">{{ kpis().verificationErrors }}</div>
            <div class="kpi-label">Verification Errors</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">🕒</div>
          <div>
            <div class="kpi-val">{{ kpis().today }}</div>
            <div class="kpi-label">Events Today</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">⚙️</div>
          <div>
            <div class="kpi-val">{{ kpis().activeModules }}</div>
            <div class="kpi-label">Active Modules</div>
          </div>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- INTEGRITY REPORT CARD -->
      <div class="integrity-report" *ngIf="integrityReport()">
        <div class="report-header" [class.report-intact]="integrityReport().intact" [class.report-tampered]="!integrityReport().intact">
          <h4>
            {{ integrityReport().intact ? '✓ Cryptographic Integrity Intact' : '⚠️ Warning: Ledger Tampering Detected!' }}
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

      <!-- Filters with 🔽 Filter icon -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>🔽 Filter by Module</label>
          <select [(ngModel)]="moduleFilter" (change)="loadAuditLogs(0)">
            <option value="All">All</option>
            <option *ngFor="let m of activeModulesList()" [value]="m">{{ m }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>🔽 Filter by Action</label>
          <select [(ngModel)]="actionFilter" (change)="loadAuditLogs(0)">
            <option value="All">All</option>
            <option *ngFor="let a of actionsList()" [value]="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <!-- Audit Table -->
      <div class="table-container">
        <table class="data-table">
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
              <td>{{ evt.performedAt | date:'medium' }}</td>
              <td><span class="role-pill">{{ evt.module }}</span></td>
              <td style="font-weight: 600;">{{ evt.action }}</td>
              <td>{{ evt.entityType }} (Code: {{ evt.entityId }})</td>
              <td>{{ evt.performedBy }}</td>
              <td>{{ evt.description }}</td>
              <td>
                <span class="status-indicator" [class.status-active]="evt.integrityVerified" [class.status-inactive]="!evt.integrityVerified">
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
      <div class="pagination" *ngIf="auditLogs().length > 0">
        <button [disabled]="page() === 0" (click)="changePage(page() - 1)">Previous</button>
        <span>Page {{ page() + 1 }} of {{ totalPages() }}</span>
        <button [disabled]="page() >= totalPages() - 1" (click)="changePage(page() + 1)">Next</button>
      </div>
    </div>
  `,
  styles: [`
    .audit-container {
      background: #ffffff;
      border: 1px solid #ece4dc;
      border-radius: 14px;
      padding: 32px;
    }
    .audit-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .audit-header h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #211611;
      margin: 0 0 6px;
    }
    .audit-header p {
      color: #7a6a5e;
      font-size: 14px;
      margin: 0;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .kpi-card {
      background: #fdfcfb;
      border: 1px solid #ece4dc;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }
    .danger-highlight {
      border-color: #b3261e;
      background: #fbeceb;
    }
    .kpi-icon {
      width: 36px; height: 36px;
      border-radius: 8px;
      background: #fbe9de;
      color: #CE5200;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
    }
    .blue-bg { background: #e8f1fa; color: #1d5f9e; }
    .green-bg { background: #e8f5e9; color: #2e7d32; }
    .red-bg { background: #fbeceb; color: #b3261e; }
    .orange-bg { background: #fff8e1; color: #f57f17; }
    .kpi-val {
      font-size: 20px;
      font-weight: 800;
      color: #211611;
    }
    .kpi-label {
      font-size: 11.5px;
      color: #7a6a5e;
      font-weight: 600;
    }
    .integrity-report {
      border: 1px solid #ece4dc;
      border-radius: 10px;
      margin-bottom: 24px;
      overflow: hidden;
    }
    .report-header {
      padding: 14px 20px;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .report-intact { background: #2e7d32; }
    .report-tampered { background: #b3261e; }
    .report-header h4 { margin: 0; font-size: 15px; font-weight: 700; }
    .report-header span { font-size: 13px; }
    .report-body {
      padding: 20px;
      background: #ffffff;
      text-align: left;
    }
    .report-kpis {
      display: flex;
      gap: 24px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    .danger-text { color: #b3261e; }
    .issues-list {
      border-top: 1px solid #ece4dc;
      padding-top: 14px;
    }
    .issues-list h5 { margin: 0 0 10px; font-size: 14px; color: #b3261e; }
    .issues-list ul { margin: 0; padding-left: 20px; font-size: 13.5px; color: #211611; }
    .filter-bar {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .filter-group label {
      font-size: 13.5px;
      font-weight: 700;
      color: #211611;
    }
    .filter-group select {
      padding: 8px 12px;
      border: 1px solid #ece4dc;
      border-radius: 6px;
      outline: none;
      font-size: 13.5px;
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
      font-size: 13.5px;
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
    }
    .role-pill {
      background: #fbe9de;
      color: #CE5200;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11.5px;
    }
    .status-indicator {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-active { background: #e8f5e9; color: #2e7d32; }
    .status-inactive { background: #fbeceb; color: #b3261e; }
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
    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      font-family: inherit;
      transition: background 0.2s ease;
    }
    .btn-primary {
      background: #CE5200;
      color: #fff;
    }
    .btn-primary:hover:not(:disabled) {
      background: #562200;
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .alert {
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13.5px;
      text-align: left;
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
