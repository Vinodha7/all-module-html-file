import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

/**
 * Audit Trail dashboard (Admin).
 *
 * Data comes ONLY from the audit-service:
 *   - GET /pharmaTrack/audit/summary          -> countsByModule, countsByAction
 *   - GET /pharmaTrack/audit/events           -> Page<AuditEventResponse>
 *   - GET /pharmaTrack/audit/events/{eventId} -> single event (drawer)
 *   - GET /pharmaTrack/audit/verifyIntegrity  -> integrity report (on demand only)
 *   - GET /pharmaTrack/audit/events/export    -> PDF / Excel bytes
 *
 * Integrity status is only known AFTER the user runs Verify Integrity (the full
 * ledger recompute) — it is never auto-run on load. Until then every row shows
 * "Not checked". Sensitive values (passwords/secrets/tokens) are masked as
 * [REDACTED] wherever they could be rendered.
 */
@Component({
  selector: 'app-audit-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <!-- Page header -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Audit Trail</h1>
          <div class="page-sub">Timestamped, tamper-evident record of every action.</div>
        </div>
        <div class="actions-row">
          <button class="btn btn-outline" (click)="verifyIntegrity()" [disabled]="verifying()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
            {{ verifying() ? 'Verifying…' : 'Verify Integrity' }}
          </button>
        </div>
      </div>

      <!-- Notification (integrity result / export status) -->
      <div class="info-banner banner-danger" *ngIf="errorMsg()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        <span>{{ errorMsg() }}</span>
      </div>
      <div class="info-banner banner-success" *ngIf="successMsg()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg>
        <span>{{ successMsg() }}</span>
      </div>

      <!-- KPI cards — fixed order -->
      <div class="kpi-grid kpi-grid-6">
        <div class="kpi-card tone-neutral">
          <div class="kpi-top"><div class="kpi-label">Total Audit Events</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg></div></div>
          <div class="kpi-value">{{ display(total()) }}</div>
        </div>
        <div class="kpi-card tone-accent">
          <div class="kpi-top"><div class="kpi-label">Verified Events</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg></div></div>
          <div class="kpi-value">{{ display(verified()) }}</div>
        </div>
        <div class="kpi-card tone-danger" [class.danger-highlight]="(tampered() ?? 0) > 0">
          <div class="kpi-top"><div class="kpi-label">Tampered Events</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><path d="M12 8v4M12 16h.01"/></svg></div></div>
          <div class="kpi-value">{{ display(tampered()) }}</div>
        </div>
        <div class="kpi-card tone-warning">
          <div class="kpi-top"><div class="kpi-label">Verification Errors</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg></div></div>
          <div class="kpi-value">{{ display(verificationErrors()) }}</div>
        </div>
        <div class="kpi-card tone-blue">
          <div class="kpi-top"><div class="kpi-label">Events Today</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div></div>
          <div class="kpi-value">{{ display(today()) }}</div>
        </div>
        <div class="kpi-card tone-neutral">
          <div class="kpi-top"><div class="kpi-label">Active Modules</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg></div></div>
          <div class="kpi-value">{{ display(activeModules()) }}</div>
        </div>
      </div>

      <!-- Icon-only filters + Tampered toggle -->
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
            <button type="button" class="dropdown-item" *ngFor="let m of ALL_MODULES" (click)="setModule(m.key)">{{ m.label }}</button>
          </div>
        </div>
        <span class="filter-chip" *ngIf="moduleFilter !== 'All'">{{ moduleLabel(moduleFilter) }}<button type="button" (click)="setModule('All')" aria-label="Clear module filter">×</button></span>

        <div class="dropdown">
          <div class="tooltip-wrap">
            <button type="button" class="icon-filter" [class.active]="actionFilter !== 'All'" aria-label="Filter by Action" (click)="toggleMenu('action')">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            </button>
            <span class="tooltip">Filter by Action</span>
          </div>
          <div class="dropdown-menu" [class.open]="openMenu() === 'action'">
            <button type="button" class="dropdown-item" (click)="setAction('All')">All Actions</button>
            <button type="button" class="dropdown-item" *ngFor="let a of actionsList()" (click)="setAction(a)">{{ a }}</button>
          </div>
        </div>
        <span class="filter-chip" *ngIf="actionFilter !== 'All'">{{ actionFilter }}<button type="button" (click)="setAction('All')" aria-label="Clear action filter">×</button></span>

        <div class="date-filter" title="From Date">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <input type="date" [(ngModel)]="fromDate" (change)="loadEvents(0)" aria-label="From Date">
        </div>
        <div class="date-filter" title="To Date">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <input type="date" [(ngModel)]="toDate" (change)="loadEvents(0)" aria-label="To Date">
        </div>

        <button type="button" class="tampered-toggle" [class.active]="tamperedOnly()" (click)="toggleTampered()"
                title="Show only tampered / unverifiable records">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v4M12 16h.01"/></svg>
          Tampered Records
        </button>
      </div>

      <!-- ══ TAMPERED EVENTS SCREEN ══ -->
      <div class="table-card" *ngIf="tamperedOnly()">
        <div class="table-card-head">
          <h3>Tampered Events <span class="count">· {{ issues().length }} flagged</span></h3>
          <button type="button" class="btn btn-secondary" (click)="toggleTampered()">← Back to all events</button>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <colgroup><col style="width:30%"><col style="width:20%"><col style="width:16%"><col style="width:34%"></colgroup>
            <thead><tr><th>Event ID</th><th>Module</th><th>Integrity Status</th><th>Reason</th></tr></thead>
            <tbody>
              <tr *ngFor="let is of issues()" class="row-click" (click)="openEvent(is.eventId)">
                <td class="mono">{{ is.eventId }}</td>
                <td class="tag">{{ moduleLabel(is.module) }}</td>
                <td><span class="badge-status" [ngClass]="badgeClass(is.status)">{{ is.status }}</span></td>
                <td>{{ failureReason(is) }}</td>
              </tr>
              <tr *ngIf="issues().length === 0">
                <td colspan="4" class="empty-state">
                  {{ integrityChecked() ? 'No tampered or unverifiable records — the ledger is intact.' : 'Run Verify Integrity to detect tampered records.' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ AUDIT EVENTS TABLE ══ -->
      <div class="table-card" *ngIf="!tamperedOnly()">
        <div class="table-card-head">
          <h3>Audit Events <span class="count">· {{ totalElements() }} total</span></h3>
          <div class="dropdown">
            <button type="button" class="btn btn-outline" (click)="toggleMenu('export')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'export'">
              <button type="button" class="dropdown-item" (click)="doExport('pdf')">Export PDF</button>
              <button type="button" class="dropdown-item" (click)="doExport('excel')">Export Excel</button>
            </div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <colgroup><col style="width:18%"><col style="width:18%"><col style="width:28%"><col style="width:16%"><col style="width:20%"></colgroup>
            <thead>
              <tr>
                <th>Action Item</th>
                <th>User Name</th>
                <th>Module Name</th>
                <th>IP Address</th>
                <th>Time Stamp</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let evt of auditLogs()" class="row-click" (click)="openEvent(evt.eventId)">
                <td><span class="action-link">{{ evt.action }}</span></td>
                <td>{{ evt.performedByName || '—' }}</td>
                <td class="tag">{{ moduleLabel(evt.module) }}</td>
                <td class="mono">{{ evt.ipAddress || '—' }}</td>
                <td>{{ evt.performedAt ? (evt.performedAt | date:'MMM d, y HH:mm:ss') : '—' }}</td>
              </tr>
              <tr *ngIf="auditLogs().length === 0">
                <td colspan="5" class="empty-state">No audit events found.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="table-footer" *ngIf="totalElements() > 0">
          <div>Page {{ page() + 1 }} of {{ totalPages() }} · {{ totalElements() }} events</div>
          <div class="pager">
            <button [disabled]="page() === 0" (click)="loadEvents(page() - 1)" aria-label="Previous page"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
            <span style="padding:0 4px;">{{ page() + 1 }} / {{ totalPages() }}</span>
            <button [disabled]="page() >= totalPages() - 1" (click)="loadEvents(page() + 1)" aria-label="Next page"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
          </div>
        </div>
      </div>

      <!-- ══ EVENT DETAILS DRAWER ══ -->
      <div class="drawer-overlay" *ngIf="drawerOpen()" (click)="closeDrawer()">
        <div class="drawer" (click)="$event.stopPropagation()">
          <div class="drawer-head">
            <h2>Event Details</h2>
            <button type="button" class="modal-close-x" style="position:static;" (click)="closeDrawer()" aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div *ngIf="selectedEvent() as e">
            <!-- Event description -->
            <div class="event-desc">{{ eventDescription(e) }}</div>

            <!-- Integrity status (kept visible in main view) -->
            <div class="integrity-box" [ngClass]="'integ-' + integrityOf(e.eventId).toLowerCase()">
              <div class="integrity-row">
                <span class="integrity-label">Integrity Status</span>
                <span class="badge-status" [ngClass]="badgeClass(integrityOf(e.eventId))">{{ integrityLabel(integrityOf(e.eventId)) }}</span>
              </div>
              <div class="integrity-reason" *ngIf="integrityOf(e.eventId) === 'TAMPERED' || integrityOf(e.eventId) === 'UNVERIFIABLE'">
                {{ failureReason(issueOf(e.eventId)) }}
              </div>
              <div class="integrity-reason dim" *ngIf="integrityOf(e.eventId) === 'UNCHECKED'">
                Not verified yet — run <strong>Verify Integrity</strong> to check this record.
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-field"><label>Module</label><div class="value">{{ moduleLabel(e.module) }}</div></div>
              <div class="detail-field"><label>Action</label><div class="value">{{ e.action }}</div></div>
              <div class="detail-field"><label>User Name</label><div class="value">{{ e.performedByName || '—' }}</div></div>
              <div class="detail-field"><label>Timestamp</label><div class="value">{{ e.performedAt ? (e.performedAt | date:'MMM d, y HH:mm:ss') : '—' }}</div></div>
              <div class="detail-field"><label>Entity Type</label><div class="value">{{ e.entityType || '—' }}</div></div>
              <div class="detail-field"><label>Business Reference</label><div class="value">{{ deriveEntityRef(e) }}</div></div>
              <div class="detail-field"><label>IP Address</label><div class="value mono">{{ e.ipAddress || '—' }}</div></div>
            </div>

            <!-- Readable field/value changes -->
            <div class="section-label">{{ changeRows(e).length && hasOldAndNew(e) ? 'Field Changes' : 'Recorded Values' }}</div>
            <div class="changes" *ngIf="changeRows(e).length; else rawFallback">
              <div class="change-row" *ngFor="let c of changeRows(e)">
                <div class="change-field">{{ c.label }}</div>
                <div class="change-val">
                  <span *ngIf="c.oldVal !== null" class="old">{{ c.oldVal }}</span>
                  <span *ngIf="c.oldVal !== null" class="arrow">→</span>
                  <span class="new">{{ c.newVal !== null ? c.newVal : '—' }}</span>
                </div>
              </div>
            </div>
            <ng-template #rawFallback>
              <pre class="json-block">{{ formatJson(e.newValues) !== '—' ? formatJson(e.newValues) : formatJson(e.oldValues) }}</pre>
            </ng-template>

            <!-- Advanced technical details (collapsible) -->
            <button type="button" class="advanced-toggle" (click)="advancedOpen.set(!advancedOpen())">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [style.transform]="advancedOpen() ? 'rotate(90deg)' : 'none'"><path d="m9 18 6-6-6-6"/></svg>
              Advanced Technical Details
            </button>
            <div class="advanced" *ngIf="advancedOpen()">
              <div class="detail-field detail-field-full"><label>Event ID</label><div class="value mono">{{ e.eventId }}</div></div>
              <div class="detail-field detail-field-full"><label>Correlation ID</label><div class="value mono">{{ e.correlationId || '—' }}</div></div>
              <div class="detail-field"><label>Source</label><div class="value">{{ e.source || '—' }}</div></div>
              <div class="detail-field detail-field-full"><label>Row Hash (keyed HMAC-SHA256)</label><div class="value mono hash-value">{{ e.rowHash || '—' }}</div></div>
              <div class="detail-field detail-field-full" *ngIf="issueOf(e.eventId)?.recomputedHash">
                <label>Recomputed Hash</label><div class="value mono hash-value">{{ issueOf(e.eventId).recomputedHash }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Always keep the six KPI cards on a single row (minmax(0,1fr) lets them shrink). */
    .kpi-grid-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
    .kpi-grid-6 .kpi-card { padding: 18px 16px; min-width: 0; }
    .kpi-grid-6 .kpi-value { font-size: 28px; }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .danger-highlight { box-shadow: 0 0 0 1px var(--danger); }

    .filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    /* Black hover tooltip (matches the Create User button tooltip). */
    .tooltip-wrap { position: relative; display: inline-flex; }
    .tooltip-wrap .tooltip {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: #211611; color: #fff; font-size: 12px; font-weight: 600;
      padding: 5px 9px; border-radius: 6px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity .15s ease; z-index: 80;
    }
    .tooltip-wrap .tooltip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #211611; }
    .tooltip-wrap:hover .tooltip { opacity: 1; }
    /* Filter dropdown: wide enough for long module names, single-line items. */
    .filter-bar .dropdown-menu { min-width: 250px; padding: 8px; }
    .filter-bar .dropdown-item { white-space: nowrap; justify-content: flex-start; padding: 9px 12px; }
    .icon-filter { width: 42px; height: 42px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #fff; color: var(--text-dim); display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .icon-filter:hover { background: #f4f6f5; color: var(--text); }
    .icon-filter.active { border-color: var(--accent); color: var(--accent-dark); background: var(--accent-light); }
    .filter-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--accent-light); color: var(--accent-dark); font-size: 12.5px; font-weight: 600; padding: 6px 8px 6px 12px; border-radius: 18px; }
    .filter-chip button { border: none; background: none; color: var(--accent-dark); font-size: 15px; line-height: 1; cursor: pointer; padding: 0 2px; }
    .date-filter { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: #fff; padding: 0 12px; height: 42px; color: var(--text-dim); }
    .date-filter input { border: none; outline: none; font-family: inherit; font-size: 14px; color: var(--text); background: transparent; }
    .tampered-toggle { display: inline-flex; align-items: center; gap: 7px; height: 42px; padding: 0 15px; margin-left: auto; border-radius: var(--radius-sm); border: 1px solid var(--border); background: #fff; color: var(--text-dim); font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
    .tampered-toggle:hover { background: #f4f6f5; color: var(--text); }
    .tampered-toggle.active { border-color: var(--danger); color: var(--danger); background: var(--danger-light); }

    .info-banner.banner-danger { background: var(--danger-light); border-color: #f0bcbc; color: var(--danger); }
    .info-banner.banner-danger svg { color: var(--danger); }
    .info-banner.banner-success { background: var(--accent-light); border-color: #f0c9a8; color: var(--accent-dark); }
    .info-banner.banner-success svg { color: var(--accent-dark); }

    .row-click { cursor: pointer; }
    /* Fit the table to the screen (no horizontal scroll); keep module on one line. */
    table.table-fixed { min-width: 0; }
    td.tag { white-space: nowrap; }
    .action-link { color: var(--blue); font-weight: 700; }
    .empty-state { text-align: center; color: var(--text-dim); font-style: italic; padding: 24px !important; }
    .pager button:disabled { opacity: 0.5; cursor: not-allowed; }

    .badge-neutral { background: #eef0ef; color: #3c463f; }
    .badge-unverifiable { background: var(--warning-light); color: var(--warning); }

    /* Drawer */
    .drawer-overlay { position: fixed; inset: 0; background: rgba(30,16,8,.5); z-index: 70; display: flex; justify-content: flex-end; }
    .drawer { width: 560px; max-width: 96vw; height: 100%; background: #fff; box-shadow: -12px 0 44px rgba(0,0,0,.22); overflow-y: auto; padding: 28px 32px; }
    .drawer-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
    .drawer-head h2 { margin: 0; font-size: 22px; font-weight: 800; }
    .event-desc { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 16px; }
    .integrity-box { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 20px; background: #faf9f7; }
    .integrity-box.integ-tampered { border-color: #f0bcbc; background: var(--danger-light); }
    .integrity-box.integ-verified { border-color: #f0c9a8; background: var(--accent-light); }
    .integrity-box.integ-unverifiable { border-color: #ead9b6; background: var(--warning-light); }
    .integrity-row { display: flex; align-items: center; justify-content: space-between; }
    .integrity-label { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); }
    .integrity-reason { font-size: 13px; color: var(--text); margin-top: 8px; line-height: 1.5; }
    .integrity-reason.dim { color: var(--text-dim); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; margin-bottom: 8px; }
    .detail-field-full { grid-column: 1 / -1; }
    .section-label { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; color: var(--text-dim); text-transform: uppercase; margin: 22px 0 10px; }
    .changes { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .change-row { display: grid; grid-template-columns: 40% 60%; border-bottom: 1px solid var(--border); }
    .change-row:last-child { border-bottom: none; }
    .change-field { padding: 10px 12px; font-size: 13px; font-weight: 600; color: var(--text-dim); background: #faf9f7; }
    .change-val { padding: 10px 12px; font-size: 13.5px; color: var(--text); word-break: break-word; }
    .change-val .old { color: var(--text-dim); text-decoration: line-through; }
    .change-val .arrow { margin: 0 7px; color: var(--text-dim); }
    .change-val .new { font-weight: 600; }
    .json-block { background: #f7f5f2; border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; font-size: 12.5px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; font-family: 'Consolas', monospace; color: var(--text); margin: 0; }
    .advanced-toggle { display: inline-flex; align-items: center; gap: 6px; margin: 24px 0 0; background: none; border: none; padding: 0; cursor: pointer; font-family: inherit; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); }
    .advanced-toggle svg { transition: transform .15s ease; }
    .advanced { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 28px; margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--border); }
    .hash-value { word-break: break-all; font-size: 13px; }
    .detail-field label { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; color: var(--text-dim); text-transform: uppercase; margin-bottom: 6px; }
    .detail-field .value { font-size: 15px; font-weight: 600; color: var(--text); }
  `]
})
export class AuditComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  total = signal<number | null>(null);
  verified = signal<number | null>(null);
  tampered = signal<number | null>(null);
  verificationErrors = signal<number | null>(null);
  today = signal<number | null>(null);
  activeModules = signal<number | null>(null);

  readonly ALL_MODULES: { key: string; label: string }[] = [
    { key: 'IdentityAccessManagement', label: 'Identity Access Management' },
    { key: 'ClinicalTrial', label: 'Clinical Trial' },
    { key: 'SubjectEnrollment', label: 'Subject Enrollment' },
    { key: 'BatchManufacturing', label: 'Batch Manufacturing' },
    { key: 'SupplyChain', label: 'Supply Chain' },
    { key: 'DeviationCAPA', label: 'Deviation & CAPA' },
    { key: 'RegulatoryAffairs', label: 'Regulatory Affairs' },
    { key: 'Notifications', label: 'Notifications' }
  ];

  moduleFilter = 'All';
  actionFilter = 'All';
  fromDate = '';
  toDate = '';

  actionsList = signal<string[]>([]);
  openMenu = signal<'module' | 'action' | 'export' | null>(null);

  // Core audit actions shown in the Action filter. CREATE/UPDATE/DELETE come from
  // the HTTP-verb mapping; SIGN is the electronic-signature action (its APPROVED/
  // REVIEWED/RELEASED meaning is carried in the event details).
  private readonly CANONICAL_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'SIGN'];

  auditLogs = signal<any[]>([]);
  page = signal<number>(0);
  pageSize = 10;
  totalPages = signal<number>(1);
  totalElements = signal<number>(0);

  verifying = signal<boolean>(false);

  // Integrity (only known after a Verify Integrity pass)
  integrityChecked = signal<boolean>(false);
  integrityByEventId = signal<Record<string, any>>({});
  issues = signal<any[]>([]);
  tamperedOnly = signal<boolean>(false);

  drawerOpen = signal<boolean>(false);
  selectedEvent = signal<any>(null);
  advancedOpen = signal<boolean>(false);

  private readonly MODULE_LABELS: Record<string, string> = {
    IdentityAccessManagement: 'Identity Access Management', IAM: 'IAM',
    ClinicalTrial: 'Clinical Trial', SubjectEnrollment: 'Subject Enrollment', SubjectEnrolment: 'Subject Enrollment',
    BatchManufacturing: 'Batch Manufacturing', SupplyChain: 'Supply Chain', DeviationCAPA: 'Deviation & CAPA',
    CAPA: 'Deviation & CAPA', RegulatoryAffairs: 'Regulatory Affairs', Notifications: 'Notifications',
    Notification: 'Notifications', Audit: 'Audit', Unknown: 'Unknown'
  };

  private readonly SENSITIVE_RE = /(password|passwd|pwd|newpassword|confirmpassword|currentpassword|secret|otp|pin|token|credential)/i;
  private readonly REF_KEYS = ['entityid', 'code', 'dossierid', 'batchnumber', 'batchid', 'shipmentid', 'subjectid', 'caparecordid', 'capaid', 'deviationid', 'trialid', 'milestoneid', 'sitename', 'productname', 'name', 'email', 'siteid', 'productid', 'signatureid', 'id'];

  ngOnInit() {
    this.fetchSummary();
    this.loadEvents(0);
    this.fetchEventsToday();
  }

  display(v: number | null): string { return v === null || v === undefined ? '—' : String(v); }

  moduleLabel(key: string): string {
    if (!key) return '—';
    if (this.MODULE_LABELS[key]) return this.MODULE_LABELS[key];
    return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  }

  // ── Humanised action / description (Group B 1 & 2) ─────────────────────────────
  private humanizeEntity(t: string): string {
    if (!t) return 'Record';
    const map: Record<string, string> = {
      User: 'User', Site: 'Site', Product: 'Product', ElectronicSignature: 'Electronic Signature',
      TrialProtocol: 'Trial Protocol', TrialSubject: 'Trial Subject', BatchRecord: 'Batch Record',
      CAPARecord: 'CAPA Record', DeviationRecord: 'Deviation Record', RegulatoryDossier: 'Regulatory Dossier',
      DrugShipment: 'Drug Shipment', Role: 'Role'
    };
    return map[t] || t.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
  }

  humanAction(action: string, entityType: string): string {
    const et = this.humanizeEntity(entityType);
    switch ((action || '').toUpperCase()) {
      case 'CREATE': return entityType === 'ElectronicSignature' ? 'Signature Created' : `New ${et} Created`;
      case 'UPDATE': return `${et} Updated`;
      case 'DELETE': return `${et} Deleted`;
      case 'SIGN': return `${et} Signed`;
      case 'APPROVE': return `${et} Approved`;
      case 'REVIEW': return `${et} Reviewed`;
      case 'RELEASE': return `${et} Released`;
      case 'REJECT': return `${et} Rejected`;
      case 'LOGIN': return 'User Logged In';
      case 'LOGOUT': return 'User Logged Out';
      default: {
        const a = (action || '').toLowerCase();
        return `${a.charAt(0).toUpperCase()}${a.slice(1)} ${et}`.trim();
      }
    }
  }

  eventDescription(e: any): string {
    const base = this.humanAction(e?.action, e?.entityType);
    const who = e?.performedByName ? ` by ${e.performedByName}` : '';
    const ref = this.deriveEntityRef(e);
    const on = ref && ref !== '—' ? ` — ${ref}` : '';
    return `${base}${on}${who}`;
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  toggleMenu(which: 'module' | 'action' | 'export') { this.openMenu.set(this.openMenu() === which ? null : which); }
  setModule(key: string) { this.moduleFilter = key; this.openMenu.set(null); this.loadEvents(0); }
  setAction(a: string) { this.actionFilter = a; this.openMenu.set(null); this.loadEvents(0); }

  toggleTampered() {
    const turningOn = !this.tamperedOnly();
    if (turningOn && !this.integrityChecked()) {
      // Tampered records are only known after a verify pass — run it (user-initiated).
      this.verifyIntegrity(() => this.tamperedOnly.set(true));
      return;
    }
    this.tamperedOnly.set(turningOn);
  }

  fetchSummary() {
    this.apiService.getAuditSummary().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const byModule = res.data.countsByModule || {};
          this.activeModules.set(Object.keys(byModule).length);
          this.actionsList.set([...this.CANONICAL_ACTIONS]);
        }
      },
      error: (err) => this.showError(err.error?.message || 'Failed to load audit summary.')
    });
  }

  private buildFilters(): any {
    const f: any = {};
    if (this.moduleFilter !== 'All') f.module = this.moduleFilter;
    if (this.actionFilter !== 'All') f.action = this.actionFilter;
    if (this.fromDate) f.from = `${this.fromDate}T00:00:00`;
    if (this.toDate) f.to = `${this.toDate}T23:59:59`;
    return f;
  }

  loadEvents(pageIdx: number) {
    this.page.set(pageIdx);
    this.apiService.getAuditEvents(pageIdx, this.pageSize, this.buildFilters()).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.auditLogs.set(res.data.content || []);
          this.totalPages.set(res.data.totalPages || 1);
          this.totalElements.set(res.data.totalElements ?? 0);
          if (!this.verifying() && this.verified() === null) this.total.set(res.data.totalElements ?? 0);
        }
      },
      error: (err) => this.showError(err.error?.message || 'Failed to load audit events.')
    });
  }

  private fetchEventsToday() {
    const now = new Date();
    const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), d = String(now.getDate()).padStart(2, '0');
    this.apiService.getAuditEvents(0, 1, { from: `${y}-${m}-${d}T00:00:00`, to: `${y}-${m}-${d}T23:59:59` }).subscribe({
      next: (res) => { if (res.success && res.data) this.today.set(res.data.totalElements ?? 0); },
      error: () => this.today.set(0)
    });
  }

  verifyIntegrity(after?: () => void) {
    this.verifying.set(true);
    this.clearMessages();
    this.apiService.verifyAuditLogIntegrity().subscribe({
      next: (res) => {
        this.verifying.set(false);
        if (res.success && res.data) {
          const r = res.data;
          this.total.set(r.total ?? this.total());
          this.verified.set(r.verified ?? 0);
          this.tampered.set(r.tampered ?? 0);
          this.verificationErrors.set(r.unverifiable ?? 0);
          const list = r.issues || [];
          this.issues.set(list);
          const map: Record<string, any> = {};
          for (const is of list) map[is.eventId] = is;
          this.integrityByEventId.set(map);
          this.integrityChecked.set(true);
          if (r.intact) this.showSuccess(`Integrity verified: all ${r.total} event(s) intact.`);
          else this.showError(`Integrity check failed: ${r.tampered} tampered, ${r.unverifiable} unverifiable of ${r.total}.`);
          if (after) after();
        } else { this.showError('Integrity verification returned no data.'); }
      },
      error: (err) => { this.verifying.set(false); this.showError(err.error?.message || 'Integrity verification failed.'); }
    });
  }

  // ── Integrity helpers ────────────────────────────────────────────────────────
  integrityOf(eventId: string): string {
    if (!this.integrityChecked()) return 'UNCHECKED';
    const is = this.integrityByEventId()[eventId];
    return is ? is.status : 'VERIFIED';
  }
  issueOf(eventId: string): any { return this.integrityByEventId()[eventId] || null; }
  integrityLabel(status: string): string {
    switch (status) {
      case 'VERIFIED': return 'Verified';
      case 'TAMPERED': return 'Tampered';
      case 'UNVERIFIABLE': return 'Unverifiable';
      default: return 'Not checked';
    }
  }
  badgeClass(status: string): Record<string, boolean> {
    return {
      'badge-approved': status === 'VERIFIED',
      'badge-rejected': status === 'TAMPERED',
      'badge-unverifiable': status === 'UNVERIFIABLE',
      'badge-neutral': status === 'UNCHECKED' || !status
    };
  }
  failureReason(is: any): string {
    if (!is) return '—';
    if (is.status === 'TAMPERED') return 'Stored hash does not match the recomputed HMAC — this record may have been altered.';
    if (is.status === 'UNVERIFIABLE') return is.reason || 'Record could not be verified (missing hash or non-canonical data).';
    return '—';
  }

  // ── Drawer ───────────────────────────────────────────────────────────────────
  openEvent(eventId: string) {
    this.selectedEvent.set(null);
    this.advancedOpen.set(false);
    this.drawerOpen.set(true);
    this.apiService.getAuditEventById(eventId).subscribe({
      next: (res) => {
        if (res.success && res.data) this.selectedEvent.set(res.data);
        else { this.drawerOpen.set(false); this.showError('Event not found.'); }
      },
      error: (err) => { this.drawerOpen.set(false); this.showError(err.error?.message || 'Failed to load event details.'); }
    });
  }
  closeDrawer() { this.drawerOpen.set(false); this.selectedEvent.set(null); }

  // ── Security redaction ─────────────────────────────────────────────────────────
  private redactString(s: string): string {
    if (!s) return s;
    return s.replace(/("?(?:password|passwd|pwd|newPassword|confirmPassword|currentPassword|secret|otp|pin|token|credential)"?\s*[:=]\s*)("?)([^,)}\]"]*)("?)/gi, (_m, p1) => `${p1}[REDACTED]`);
  }
  private redactObject(v: any): any {
    if (Array.isArray(v)) return v.map(x => this.redactObject(x));
    if (v && typeof v === 'object') {
      const out: any = {};
      for (const k of Object.keys(v)) out[k] = this.SENSITIVE_RE.test(k) ? '[REDACTED]' : this.redactObject(v[k]);
      return out;
    }
    return v;
  }
  formatJson(v: any): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'string') return this.redactString(v);
    try { return JSON.stringify(this.redactObject(v), null, 2); } catch { return this.redactString(String(v)); }
  }

  // ── Readable field/value changes (Group B 4) ───────────────────────────────────
  hasOldAndNew(e: any): boolean {
    return Object.keys(this.toDisplayMap(e?.oldValues)).length > 0 && Object.keys(this.toDisplayMap(e?.newValues)).length > 0;
  }
  changeRows(e: any): { label: string; oldVal: string | null; newVal: string | null }[] {
    const oldMap = this.toDisplayMap(e?.oldValues);
    const newMap = this.toDisplayMap(e?.newValues);
    const keys = Array.from(new Set([...Object.keys(oldMap), ...Object.keys(newMap)]));
    return keys.map(k => ({
      label: this.humanizeField(k),
      oldVal: oldMap[k] !== undefined ? oldMap[k] : null,
      newVal: newMap[k] !== undefined ? newMap[k] : null
    }));
  }
  /** Parse a Lombok toString or JSON into an original-case, redacted key/value map. */
  private toDisplayMap(v: any): Record<string, string> {
    if (v === null || v === undefined || v === '') return {};
    if (typeof v === 'object') return this.flattenDisplay(v);
    if (typeof v === 'string') {
      const t = v.trim();
      if (t.startsWith('{') || t.startsWith('[')) {
        try { return this.flattenDisplay(JSON.parse(t)); } catch { /* fall through */ }
      }
      return this.parseKvDisplay(t);
    }
    return {};
  }
  private flattenDisplay(o: any): Record<string, string> {
    const map: Record<string, string> = {};
    if (!o || typeof o !== 'object') return map;
    for (const k of Object.keys(o)) {
      const val = o[k];
      if (val === null || typeof val !== 'object') {
        map[k] = this.SENSITIVE_RE.test(k) ? '[REDACTED]' : String(val);
      }
    }
    return map;
  }
  private parseKvDisplay(s: string): Record<string, string> {
    const map: Record<string, string> = {};
    const re = /(\w+)\s*=\s*([^,()]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      const key = m[1];
      map[key] = this.SENSITIVE_RE.test(key) ? '[REDACTED]' : m[2].trim();
    }
    return map;
  }
  private humanizeField(k: string): string {
    return k.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase()).trim();
  }

  // ── Business reference (used for Business Reference + subtitle/description) ─────
  deriveEntityRef(e: any): string {
    if (e?.entityId !== null && e?.entityId !== undefined && String(e.entityId).trim() !== '') return String(e.entityId);
    const ref = this.extractRef(e?.newValues) || this.extractRef(e?.oldValues);
    return ref || '—';
  }
  private extractRef(v: any): string | null {
    if (!v) return null;
    let map: Record<string, string> | null = null;
    if (typeof v === 'string') {
      try { const p = JSON.parse(v); if (p && typeof p === 'object') map = this.lowerKeys(p); }
      catch { map = this.parseKvLower(v); }
    } else if (typeof v === 'object') { map = this.lowerKeys(v); }
    if (!map) return null;
    for (const key of this.REF_KEYS) {
      if (map[key] !== undefined && String(map[key]).trim() !== '') {
        if (this.SENSITIVE_RE.test(key)) return '[REDACTED]';
        return String(map[key]).trim();
      }
    }
    return null;
  }
  private parseKvLower(s: string): Record<string, string> {
    const map: Record<string, string> = {};
    const re = /(\w+)\s*=\s*([^,()]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) map[m[1].toLowerCase()] = m[2].trim();
    return map;
  }
  private lowerKeys(o: any): Record<string, string> {
    const map: Record<string, string> = {};
    for (const k of Object.keys(o)) { const val = o[k]; if (val !== null && typeof val !== 'object') map[k.toLowerCase()] = String(val); }
    return map;
  }

  doExport(format: 'pdf' | 'excel') {
    this.openMenu.set(null);
    this.apiService.exportAuditEvents(format, this.buildFilters()).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = format === 'excel' ? 'audit-events.xlsx' : 'audit-events.pdf'; a.click();
        window.URL.revokeObjectURL(url);
        this.showSuccess(`Audit events exported as ${format === 'excel' ? 'Excel' : 'PDF'}.`);
      },
      error: (err) => this.showError(err.error?.message || 'Export failed.')
    });
  }

  showSuccess(msg: string) { this.successMsg.set(msg); this.errorMsg.set(null); setTimeout(() => this.successMsg.set(null), 5000); }
  showError(msg: string) { this.errorMsg.set(msg); this.successMsg.set(null); setTimeout(() => this.errorMsg.set(null), 6000); }
  clearMessages() { this.errorMsg.set(null); this.successMsg.set(null); }
}
