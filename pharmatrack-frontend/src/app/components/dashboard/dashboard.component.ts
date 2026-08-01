import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

type Tone = 'tone-accent' | 'tone-blue' | 'tone-danger' | 'tone-neutral' | 'tone-warning';

interface KpiCard { label: string; value: number | string; tone: Tone; icon: string; }
interface ActivityRow { title: string; sub: string; time: string | null; }

/**
 * ONE shared dashboard for every role. Layout is common; the CONTENT (welcome
 * text + KPI cards + activity panels) is driven entirely by the logged-in user's
 * role and permissions. A role only ever fetches data for the modules it can
 * access, so no user sees KPIs from unauthorized modules.
 *
 * All KPI numbers are computed client-side from real list endpoints (the backend
 * exposes no count/summary endpoints except audit). Recent-activity panels are
 * shown for Admin only (the only role with a well-supported activity feed).
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-page">
      <!-- Hero / welcome (role-specific) -->
      <div class="hero-banner">
        <div class="hero-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h1>Welcome back, {{ userName() }}.</h1>
        <p>{{ welcomeSub() }}</p>
      </div>

      <!-- KPI grid — exactly one row sized to the number of cards -->
      <div class="kpi-grid" [style.gridTemplateColumns]="'repeat(' + kpis().length + ', minmax(0, 1fr))'">
        <div class="kpi-card" *ngFor="let kpi of kpis()" [ngClass]="kpi.tone">
          <div class="kpi-top">
            <div class="kpi-label">{{ kpi.label }}</div>
            <div class="kpi-icon" [innerHTML]="icon(kpi.icon)"></div>
          </div>
          <div class="kpi-value">{{ kpi.value }}</div>
        </div>
        <div class="kpi-empty" *ngIf="!loading() && kpis().length === 0">No dashboard metrics available for your role.</div>
        <div class="kpi-empty" *ngIf="loading()">Loading your dashboard…</div>
      </div>

      <!-- Activity panels (Admin only) -->
      <div class="panel-grid" *ngIf="isAdmin()">
        <div class="panel-card">
          <div class="panel-head"><h3>Recent User Activity</h3></div>
          <div class="panel-body">
            <div class="activity-row" *ngFor="let a of recentUsers()">
              <span class="status-dot dot-accent"></span>
              <div class="row-main"><div class="row-title">{{ a.title }}</div><div class="row-sub">{{ a.sub }}</div></div>
              <div class="row-time">{{ a.time ? (a.time | date:'MMM d, HH:mm') : '' }}</div>
            </div>
            <div class="activity-empty" *ngIf="recentUsers().length === 0">No recent user activity.</div>
          </div>
        </div>
        <div class="panel-card">
          <div class="panel-head"><h3>Recent Signature Activity</h3></div>
          <div class="panel-body">
            <div class="activity-row" *ngFor="let a of recentSignatures()">
              <span class="status-dot dot-blue"></span>
              <div class="row-main"><div class="row-title">{{ a.title }}</div><div class="row-sub">{{ a.sub }}</div></div>
              <div class="row-time">{{ a.time ? (a.time | date:'MMM d, HH:mm') : '' }}</div>
            </div>
            <div class="activity-empty" *ngIf="recentSignatures().length === 0">No recent signature activity.</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;}
    .dashboard-page{display:flex;flex-direction:column;height:calc(100vh - 150px);overflow:hidden;}
    .hero-banner{margin-bottom:14px;padding:18px 26px;}
    .hero-banner h1{font-size:21px;margin:0 0 4px 0;}
    .hero-banner p{font-size:13.5px;}
    .kpi-grid{display:grid;gap:12px;margin-bottom:16px;align-items:stretch;width:100%;}
    .kpi-card{min-width:0;padding:14px 14px;overflow:hidden;}
    .kpi-top{min-width:0;gap:8px;}
    .kpi-value{font-size:24px;}
    .kpi-label{font-size:12px;min-width:0;overflow-wrap:anywhere;}
    .kpi-icon{width:30px;height:30px;flex-shrink:0;}
    .kpi-icon :is(svg){width:17px;height:17px;}
    .kpi-empty{grid-column:1/-1;color:var(--text-dim);font-size:14px;padding:8px 2px;}

    .panel-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;flex:1;min-height:0;}
    @media (max-width:900px){ .panel-grid{grid-template-columns:1fr;} }
    .panel-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 22px;display:flex;flex-direction:column;min-height:0;}
    .panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;}
    .panel-head h3{margin:0;font-size:16px;font-weight:800;font-family:'Manrope',sans-serif;letter-spacing:-0.01em;}
    .panel-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow-y:auto;}
    .activity-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f2f4f3;}
    .activity-row:last-child{border-bottom:none;}
    .status-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;align-self:flex-start;margin-top:5px;}
    .dot-accent{background:var(--accent);}
    .dot-blue{background:var(--blue);}
    .row-main{flex:1;min-width:0;}
    .row-title{font-size:13.5px;font-weight:700;color:var(--text);line-height:1.3;}
    .row-sub{font-size:12px;color:var(--text-dim);line-height:1.4;margin-top:2px;}
    .row-time{font-size:12px;color:var(--text-dim);white-space:nowrap;flex-shrink:0;align-self:flex-start;}
    .activity-empty{color:var(--text-dim);font-size:13px;font-style:italic;padding:12px 0;}
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);

  userName = signal<string>('User');
  welcomeSub = signal<string>('');
  kpis = signal<KpiCard[]>([]);
  recentUsers = signal<ActivityRow[]>([]);
  recentSignatures = signal<ActivityRow[]>([]);
  loading = signal<boolean>(true);

  private role = 'Default';
  isAdmin() { return this.role === 'Admin'; }

  private readonly WELCOME: Record<string, string> = {
    Admin: 'Manage users, permissions, audit activity and system compliance.',
    Researcher: 'Manage clinical trials, protocols and subject enrollment activities.',
    Investigator: 'Review subject activity and approve clinical trial protocols.',
    QAAnalyst: 'Monitor batch quality, deviations and CAPA activities.',
    ManufacturingSupervisor: 'Track manufacturing operations and raw material usage.',
    SupplyChain: 'Monitor shipments, inventory and cold chain activities.',
    RegulatoryOfficer: 'Manage dossiers, submissions and regulatory milestones.',
    Default: "Here's a snapshot of your PharmaTrack activity."
  };

  private readonly ICONS: Record<string, string> = {
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    signature: '<path d="M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M3 21h18"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
    flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    thermometer: '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
  };

  icon(key: string): SafeHtml {
    const inner = this.ICONS[key] || this.ICONS['box'];
    return this.sanitizer.bypassSecurityTrustHtml(
      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
    );
  }

  ngOnInit() {
    const user = this.authService.currentUser();
    this.userName.set(user?.name || user?.email || 'User');
    this.role = this.roleKey();
    this.welcomeSub.set(this.WELCOME[this.role] || this.WELCOME['Default']);
    this.load();
  }

  private roleKey(): string {
    const raw = (this.authService.role() || '').toLowerCase().replace(/[^a-z]/g, '');
    if (raw.includes('admin')) return 'Admin';
    if (raw.includes('investigator')) return 'Investigator';
    if (raw.includes('researcher')) return 'Researcher';
    if (raw.includes('qa')) return 'QAAnalyst';
    if (raw.includes('manufactur') || raw.includes('supervisor') || raw.includes('mfg')) return 'ManufacturingSupervisor';
    if (raw.includes('supply')) return 'SupplyChain';
    if (raw.includes('regulat')) return 'RegulatoryOfficer';
    return 'Default';
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private arr(res: any): any[] {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.content)) return res.content;
    if (res.data && Array.isArray(res.data.content)) return res.data.content;
    return [];
  }
  private u(v: any): string { return (v ?? '').toString().toUpperCase(); }
  private countBy(list: any[], pred: (s: string) => boolean): number {
    return list.filter(x => pred(this.u(x?.status))).length;
  }
  private guard() { return catchError(() => of(null)); }

  private load() {
    switch (this.role) {
      case 'Admin': return this.loadAdmin();
      case 'Researcher': return this.loadResearcher();
      case 'Investigator': return this.loadInvestigator();
      case 'QAAnalyst': return this.loadQa();
      case 'ManufacturingSupervisor': return this.loadMfg();
      case 'SupplyChain': return this.loadSupply();
      case 'RegulatoryOfficer': return this.loadRegulatory();
      default: this.loading.set(false);
    }
  }

  private loadAdmin() {
    forkJoin({
      users: this.api.getUsers().pipe(this.guard()),
      products: this.api.getProducts().pipe(this.guard()),
      sites: this.api.getSites().pipe(this.guard()),
      summary: this.api.getAuditSummary().pipe(this.guard()),
      integrity: this.api.verifyAuditLogIntegrity().pipe(this.guard()),
      events: this.api.getAuditEvents(0, 6).pipe(this.guard()),
      sigs: this.api.getAllSignatures().pipe(this.guard())
    }).subscribe(r => {
      const users = this.arr(r.users);
      const active = users.filter(u => this.u(u?.status) === 'ACTIVE').length;
      const byModule = (r.summary as any)?.data?.countsByModule || {};
      const totalEvents = Object.values(byModule).reduce((a: number, b: any) => a + Number(b || 0), 0);
      const integ = (r.integrity as any)?.data || {};
      this.kpis.set([
        { label: 'Total Users', value: users.length, tone: 'tone-neutral', icon: 'users' },
        { label: 'Active Users', value: active, tone: 'tone-accent', icon: 'check' },
        { label: 'Products', value: this.arr(r.products).length, tone: 'tone-blue', icon: 'box' },
        { label: 'Sites', value: this.arr(r.sites).length, tone: 'tone-neutral', icon: 'pin' },
        { label: 'Total Audit Events', value: totalEvents, tone: 'tone-neutral', icon: 'database' },
        { label: 'Verified Events', value: integ.verified ?? '—', tone: 'tone-accent', icon: 'check' },
        { label: 'Tampered Events', value: integ.tampered ?? '—', tone: 'tone-danger', icon: 'alert' }
      ]);
      const events = this.arr(r.events);
      this.recentUsers.set(events.slice(0, 6).map(e => ({
        title: `${this.humanAction(e?.action)} · ${this.moduleLabel(e?.module)}`,
        sub: e?.performedByName || '—',
        time: e?.performedAt || null
      })));
      const sigs = this.arr(r.sigs)
        .slice()
        .sort((a, b) => (b?.signedAt || '').localeCompare(a?.signedAt || ''));
      this.recentSignatures.set(sigs.slice(0, 6).map(s => ({
        title: `${(s?.meaning || 'SIGNED')} · ${s?.entityType || '—'}`,
        sub: s?.signerName || '—',
        time: s?.signedAt || null
      })));
      this.loading.set(false);
    });
  }

  private loadResearcher() {
    forkJoin({
      trials: this.api.getAllTrials().pipe(this.guard()),
      subjects: this.api.getSubjects().pipe(this.guard())
    }).subscribe(r => {
      const trials = this.arr(r.trials);
      this.kpis.set([
        { label: 'Total Trials', value: trials.length, tone: 'tone-neutral', icon: 'clipboard' },
        { label: 'Active Trials', value: this.countBy(trials, s => s === 'ACTIVE'), tone: 'tone-accent', icon: 'check' },
        { label: 'Subjects Enrolled', value: this.arr(r.subjects).length, tone: 'tone-blue', icon: 'users' }
      ]);
      this.loading.set(false);
    });
  }

  private loadInvestigator() {
    forkJoin({
      trials: this.api.getAllTrials().pipe(this.guard()),
      subjects: this.api.getSubjects().pipe(this.guard()),
      sigs: this.api.getAllSignatures().pipe(this.guard())
    }).subscribe(r => {
      const trials = this.arr(r.trials);
      const subjects = this.arr(r.subjects);
      const clinicalTypes = ['TRIALPROTOCOL', 'CLINICALTRIAL', 'TRIALSITE', 'TRIALSUBJECT', 'VISITRECORD', 'ADVERSEEVENT'];
      const sigCount = this.arr(r.sigs).filter(s => clinicalTypes.includes(this.u(s?.entityType))).length;
      this.kpis.set([
        { label: 'Total Trials', value: trials.length, tone: 'tone-neutral', icon: 'clipboard' },
        { label: 'Active Trials', value: this.countBy(trials, s => s === 'ACTIVE'), tone: 'tone-accent', icon: 'check' },
        { label: 'Reviewed Subjects', value: this.countBy(subjects, s => s === 'REVIEWED'), tone: 'tone-blue', icon: 'eye' },
        { label: 'Signature Activity', value: sigCount, tone: 'tone-accent', icon: 'signature' }
      ]);
      this.loading.set(false);
    });
  }

  private loadQa() {
    forkJoin({
      batches: this.api.getBatches().pipe(this.guard()),
      capas: this.api.getCapas().pipe(this.guard()),
      devs: this.api.getDeviations().pipe(this.guard())
    }).subscribe(r => {
      const batches = this.arr(r.batches);
      const notClosed = (s: string) => s !== 'CLOSED' && s !== 'CLS';
      this.kpis.set([
        { label: 'Batch Records', value: batches.length, tone: 'tone-neutral', icon: 'box' },
        { label: 'QC Hold Records', value: this.countBy(batches, s => s === 'QCH'), tone: 'tone-warning', icon: 'alert' },
        { label: 'Released Batches', value: this.countBy(batches, s => s === 'REL'), tone: 'tone-accent', icon: 'check' },
        { label: 'Open CAPAs', value: this.countBy(this.arr(r.capas), notClosed), tone: 'tone-danger', icon: 'clipboard' },
        { label: 'Open Deviations', value: this.countBy(this.arr(r.devs), notClosed), tone: 'tone-danger', icon: 'alert' }
      ]);
      this.loading.set(false);
    });
  }

  private loadMfg() {
    forkJoin({
      batches: this.api.getBatches().pipe(this.guard()),
      raw: this.api.getAllRawMaterials().pipe(this.guard())
    }).subscribe(r => {
      const batches = this.arr(r.batches);
      const active = (s: string) => s === 'INPROGRESS' || s === 'IP';
      this.kpis.set([
        { label: 'Active Batches', value: this.countBy(batches, active), tone: 'tone-accent', icon: 'box' },
        { label: 'Raw Material Usage', value: this.arr(r.raw).length, tone: 'tone-blue', icon: 'flask' },
        { label: 'In-Progress Manufacturing', value: this.countBy(batches, active), tone: 'tone-neutral', icon: 'clock' }
      ]);
      this.loading.set(false);
    });
  }

  private loadSupply() {
    forkJoin({
      shipments: this.api.getShipments().pipe(this.guard()),
      excursions: this.api.getExcursionLogs().pipe(this.guard()),
      inventory: this.api.getInventory().pipe(this.guard())
    }).subscribe(r => {
      const shipments = this.arr(r.shipments);
      this.kpis.set([
        { label: 'Shipments', value: shipments.length, tone: 'tone-neutral', icon: 'truck' },
        { label: 'In-Transit Shipments', value: this.countBy(shipments, s => s === 'INTRANSIT'), tone: 'tone-blue', icon: 'truck' },
        { label: 'Delivered Shipments', value: this.countBy(shipments, s => s === 'DELIVERED'), tone: 'tone-accent', icon: 'check' },
        { label: 'Inventory Records', value: this.arr(r.inventory).length, tone: 'tone-neutral', icon: 'box' },
        { label: 'Cold Chain Excursions', value: this.arr(r.excursions).length, tone: 'tone-danger', icon: 'thermometer' }
      ]);
      this.loading.set(false);
    });
  }

  private loadRegulatory() {
    const today = new Date().toISOString().slice(0, 10);
    forkJoin({
      dossiers: this.api.getDossiers().pipe(this.guard()),
      milestones: this.api.getAllMilestones().pipe(this.guard())
    }).subscribe(r => {
      const dossiers = this.arr(r.dossiers);
      const pending = (s: string) => s === 'INPREPARATION' || s === 'UNDERREVIEW';
      const milestones = this.arr(r.milestones);
      const upcoming = milestones.filter(m =>
        this.u(m?.status) === 'PENDING' && (m?.milestoneDate || '') >= today).length;
      this.kpis.set([
        { label: 'Regulatory Dossiers', value: dossiers.length, tone: 'tone-neutral', icon: 'file' },
        { label: 'Pending Submissions', value: this.countBy(dossiers, pending), tone: 'tone-warning', icon: 'clock' },
        { label: 'Approved Dossiers', value: this.countBy(dossiers, s => s === 'APPROVED'), tone: 'tone-accent', icon: 'check' },
        { label: 'Upcoming Milestones', value: upcoming, tone: 'tone-blue', icon: 'clock' }
      ]);
      this.loading.set(false);
    });
  }

  // ── labels for the Admin activity feeds ──
  private humanAction(a: string): string {
    const k = this.u(a);
    const map: Record<string, string> = {
      CREATE: 'Created', UPDATE: 'Updated', DELETE: 'Deleted', SIGN: 'Signed',
      LOGIN: 'Logged in', LOGOUT: 'Logged out', APPROVE: 'Approved', REJECT: 'Rejected'
    };
    return map[k] || (a || '—');
  }
  private moduleLabel(m: string): string {
    const map: Record<string, string> = {
      IdentityAccessManagement: 'Identity Access', ClinicalTrial: 'Clinical Trial',
      SubjectEnrollment: 'Subject Enrollment', BatchManufacturing: 'Batch Manufacturing',
      SupplyChain: 'Supply Chain', DeviationCAPA: 'Deviation & CAPA',
      RegulatoryAffairs: 'Regulatory Affairs', Notifications: 'Notifications'
    };
    return map[m] || m || '—';
  }
}
