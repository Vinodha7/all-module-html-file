import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type Tone = 'tone-accent' | 'tone-blue' | 'tone-danger' | 'tone-neutral' | 'tone-warning';

interface KpiCard {
  label: string;
  value: number;
  tone: Tone;
  icon: 'check' | 'users' | 'alert' | 'signature' | 'box' | 'truck' | 'thermometer';
}

interface PriorityAlert {
  severity: 'critical' | 'warning';
  title: string;
  subtitle: string;
  time: string;
}

interface PendingApproval {
  icon: 'signature' | 'users' | 'alert' | 'file';
  title: string;
  subtitle: string;
  count: number;
}

interface ModuleLink {
  permission: string;
  title: string;
  desc: string;
  link: string;
  cta: string;
  icon: 'admin' | 'trials' | 'subjects' | 'batches' | 'deviations' | 'supply' | 'regulatory' | 'audit';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-page">
      <!-- Hero banner -->
      <div class="hero-banner">
        <div class="hero-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h1>Welcome back, {{ userName() }}</h1>
        <p>Here's a snapshot of what needs your attention across <strong>PharmaTrack</strong> today.</p>
      </div>

      <!-- KPI grid -->
      <div class="kpi-grid">
        <div class="kpi-card" *ngFor="let kpi of kpis()" [ngClass]="kpi.tone">
          <div class="kpi-top">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-icon">
              <ng-container [ngSwitch]="kpi.icon">
                <svg *ngSwitchCase="'check'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <svg *ngSwitchCase="'users'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <svg *ngSwitchCase="'alert'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <svg *ngSwitchCase="'signature'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
                </svg>
                <svg *ngSwitchCase="'box'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <svg *ngSwitchCase="'truck'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <svg *ngSwitchCase="'thermometer'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
                </svg>
              </ng-container>
            </div>
          </div>
          <div class="kpi-value">{{ kpi.value }}</div>
        </div>
      </div>

      <!-- Two-panel grid -->
      <div class="panel-grid">
        <!-- Priority Alerts -->
        <div class="panel-card">
          <div class="panel-head">
            <h3>Priority Alerts</h3>
            <a routerLink="/deviations" class="panel-link">View all</a>
          </div>
          <div class="panel-body">
            <div class="alert-row" *ngFor="let alert of priorityAlerts()">
              <span class="status-dot" [ngClass]="'dot-' + alert.severity"></span>
              <div class="row-main">
                <div class="row-title">{{ alert.title }}</div>
                <div class="row-sub">{{ alert.subtitle }}</div>
              </div>
              <div class="row-time">{{ alert.time }}</div>
            </div>
          </div>
        </div>

        <!-- Pending Approvals -->
        <div class="panel-card">
          <div class="panel-head">
            <h3>Pending Approvals</h3>
            <a routerLink="/users" class="panel-link">Review all</a>
          </div>
          <div class="panel-body">
            <div class="approval-row" *ngFor="let approval of pendingApprovals()">
              <div class="approval-icon">
                <ng-container [ngSwitch]="approval.icon">
                  <svg *ngSwitchCase="'signature'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
                  </svg>
                  <svg *ngSwitchCase="'users'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <svg *ngSwitchCase="'alert'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <svg *ngSwitchCase="'file'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                </ng-container>
              </div>
              <div class="row-main">
                <div class="row-title">{{ approval.title }}</div>
                <div class="row-sub">{{ approval.subtitle }}</div>
              </div>
              <span class="count-badge">{{ approval.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick access modules (optional, permission-guarded) -->
      <h2 class="section-heading">Quick access</h2>
      <div class="module-grid">
        <ng-container *ngFor="let mod of modules">
        <div class="module-card" *ngIf="hasPermission(mod.permission)">
          <div class="module-card-top">
            <div class="module-card-icon">
              <ng-container [ngSwitch]="mod.icon">
                <svg *ngSwitchCase="'admin'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <svg *ngSwitchCase="'trials'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <svg *ngSwitchCase="'subjects'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <svg *ngSwitchCase="'batches'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
                </svg>
                <svg *ngSwitchCase="'deviations'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <svg *ngSwitchCase="'supply'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
                <svg *ngSwitchCase="'regulatory'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                <svg *ngSwitchCase="'audit'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/>
                </svg>
              </ng-container>
            </div>
            <div class="module-card-title">{{ mod.title }}</div>
          </div>
          <p class="module-card-desc">{{ mod.desc }}</p>
          <a [routerLink]="mod.link" class="btn btn-outline module-card-btn">
            {{ mod.cta }}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </a>
        </div>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;}
    /* Static dashboard — fills the viewport height, no scroll */
    .dashboard-page{display:flex;flex-direction:column;height:calc(100vh - 150px);overflow:hidden;}
    .dashboard-page .hero-banner{margin-bottom:16px;padding:22px 28px;}
    .dashboard-page .hero-banner h1{font-size:22px;margin:0 0 6px 0;}
    .dashboard-page .kpi-grid{margin-bottom:16px;}
    /* Quick-access module grid is hidden on the one-screen dashboard */
    .dashboard-page .section-heading, .dashboard-page .module-grid{display:none;}

    /* Two-panel list section — fills the remaining height */
    .panel-grid{
      display:grid;
      grid-template-columns:repeat(2,1fr);
      gap:20px;
      flex:1;
      min-height:0;
      margin-bottom:0;
    }
    @media (max-width:900px){
      .panel-grid{grid-template-columns:1fr;}
    }
    .panel-card{
      background:var(--card);
      border:1px solid var(--border);
      border-radius:var(--radius-lg);
      padding:22px 24px;
      display:flex;
      flex-direction:column;
      min-height:0;
    }
    .panel-head{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:6px;
    }
    .panel-head h3{
      margin:0;font-size:16px;font-weight:800;color:var(--text);
      font-family:'Manrope',sans-serif;letter-spacing:-0.01em;
    }
    .panel-link{
      font-size:13px;font-weight:600;color:var(--text-dim);
      text-decoration:none;
    }
    .panel-link:hover{color:var(--accent-dark);}
    .panel-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}

    .alert-row, .approval-row{
      display:flex;align-items:center;gap:13px;
      padding:14px 0;
      border-bottom:1px solid #f2f4f3;
    }
    .alert-row:last-child, .approval-row:last-child{border-bottom:none;}

    .status-dot{
      width:9px;height:9px;border-radius:50%;flex-shrink:0;
      margin-top:2px;align-self:flex-start;
    }
    .dot-critical{background:var(--danger);}
    .dot-warning{background:var(--warning);}

    .row-main{flex:1;min-width:0;}
    .row-title{font-size:14px;font-weight:700;color:var(--text);line-height:1.3;}
    .row-sub{font-size:12.5px;color:var(--text-dim);line-height:1.45;margin-top:3px;}
    .row-time{
      font-size:12.5px;color:var(--text-dim);font-weight:500;
      white-space:nowrap;flex-shrink:0;align-self:flex-start;
    }

    .approval-icon{
      width:36px;height:36px;border-radius:10px;flex-shrink:0;
      background:var(--accent-light);color:var(--accent-dark);
      display:flex;align-items:center;justify-content:center;
    }
    .count-badge{
      flex-shrink:0;
      min-width:26px;height:26px;padding:0 8px;
      border-radius:13px;
      background:var(--accent);color:#fff;
      font-size:13px;font-weight:700;
      display:flex;align-items:center;justify-content:center;
    }

    /* Quick access module cards */
    .module-card{
      transition:transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .module-card:hover{
      transform:translateY(-4px);
      box-shadow:0 10px 20px rgba(86, 34, 0, 0.08);
      border-color:var(--accent);
    }
    .module-card-btn{margin-top:4px;}
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);

  userName = signal<string>('User');
  userRole = signal<string>('Staff');

  kpis = signal<KpiCard[]>([
    { label: 'Active Trials', value: 7, tone: 'tone-accent', icon: 'check' },
    { label: 'Subjects Enrolled', value: 98, tone: 'tone-blue', icon: 'users' },
    { label: 'Open Deviations', value: 5, tone: 'tone-danger', icon: 'alert' },
    { label: 'Pending E-Signatures', value: 12, tone: 'tone-accent', icon: 'signature' },
    { label: 'Batches in QC', value: 3, tone: 'tone-neutral', icon: 'box' },
    { label: 'Active Shipments', value: 9, tone: 'tone-neutral', icon: 'truck' },
    { label: 'Cold-Chain Excursions', value: 2, tone: 'tone-danger', icon: 'thermometer' }
  ]);

  priorityAlerts = signal<PriorityAlert[]>([
    { severity: 'critical', title: 'Cold-chain excursion', subtitle: 'Shipment SHP-2026-0043 exceeded 8°C · Supply Chain', time: '12m ago' },
    { severity: 'critical', title: 'CAPA overdue', subtitle: 'CAPA-2026-018 past its target date · Deviations', time: '1d ago' },
    { severity: 'warning', title: 'Submission deadline', subtitle: 'Diabetes study dossier due in 3 days · Regulatory', time: 'Today' },
    { severity: 'warning', title: 'Low kit inventory', subtitle: 'Site 4 drug kit stock below threshold · Supply Chain', time: '2d ago' }
  ]);

  pendingApprovals = signal<PendingApproval[]>([
    { icon: 'signature', title: 'E-signatures awaiting sign-off', subtitle: 'Batch & protocol records', count: 12 },
    { icon: 'users', title: 'User access requests', subtitle: 'New staff accounts to approve', count: 3 },
    { icon: 'alert', title: 'CAPAs pending review', subtitle: 'Quality approval needed', count: 2 },
    { icon: 'file', title: 'Protocol amendment', subtitle: 'IRB update awaiting approval', count: 1 }
  ]);

  modules: ModuleLink[] = [
    { permission: 'Administration', title: 'System Administration', desc: 'Configure products, clinical sites, user privileges, electronic signatures, and identity mappings.', link: '/users', cta: 'Manage Users & Site Mappings', icon: 'admin' },
    { permission: 'Clinical Trials', title: 'Clinical Trials', desc: 'Create and monitor clinical study protocols, configure site parameters, and transition study states.', link: '/trials', cta: 'View Clinical Trials', icon: 'trials' },
    { permission: 'Subjects', title: 'Subject Enrollment', desc: 'Enroll trial subjects, record patient visit entries, log adverse events, and track history logs.', link: '/subjects', cta: 'Manage Subject Cohort', icon: 'subjects' },
    { permission: 'Batch Manufacturing', title: 'Batch Manufacturing', desc: 'Monitor manufacturing progress, check raw material lists, run QC Tests, and release batches.', link: '/batches', cta: 'Inspect Batch Runs & QC', icon: 'batches' },
    { permission: 'Deviation & CAPA', title: 'Deviations & CAPA', desc: 'Document discrepancies, assign deviation codes, launch investigative workflows, and track CAPA corrective actions.', link: '/deviations', cta: 'Access Deviations Panel', icon: 'deviations' },
    { permission: 'Supply Chain', title: 'Supply Chain & Cold Chain', desc: 'Track shipment dispatches, manage site inventory status, and register sensor temperature readings.', link: '/supply-chain', cta: 'View Supply & Logistics', icon: 'supply' },
    { permission: 'Regulatory Affairs', title: 'Regulatory Affairs', desc: 'Compile dossier codes, track regulatory milestones, submit dossiers, and record approval workflow events.', link: '/regulatory', cta: 'Go to Regulatory Dossiers', icon: 'regulatory' },
    { permission: 'Audit', title: 'Compliance & Audit Ledger', desc: 'Verify data integrity, query the unalterable event database log, view metrics, and export compliance reports.', link: '/audit', cta: 'Access Audit Logs', icon: 'audit' }
  ];

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.userName.set(user.name || user.email);
      this.userRole.set(user.role || this.authService.role() || 'Staff');
    }
  }

  hasPermission(moduleName: string): boolean {
    return this.authService.hasPermission(moduleName);
  }
}
