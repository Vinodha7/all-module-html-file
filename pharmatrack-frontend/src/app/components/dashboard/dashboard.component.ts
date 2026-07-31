import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-container">
      <div class="welcome-banner">
        <h1>Welcome back, {{ userName() }}</h1>
        <p>PharmaTrack Enterprise System — Current Active Role: <span class="badge">{{ userRole() }}</span></p>
      </div>

      <div class="modules-grid">
        <!-- Administration Card (Admin only) -->
        <div class="module-card" *ngIf="hasPermission('Administration')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>System Administration</h3>
          <p>Configure products, clinical sites, user privileges, electronic signatures, and identity mappings.</p>
          <a routerLink="/users" class="btn-link">Manage Users & Site Mappings →</a>
        </div>

        <!-- Clinical Trials Card -->
        <div class="module-card" *ngIf="hasPermission('Clinical Trials')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <h3>Clinical Trials</h3>
          <p>Create and monitor clinical study protocols, configure site parameters, and transition study states.</p>
          <a routerLink="/trials" class="btn-link">View Clinical Trials →</a>
        </div>

        <!-- Subjects Enrollment Card -->
        <div class="module-card" *ngIf="hasPermission('Subjects')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h3>Subject Enrollment</h3>
          <p>Enroll trial subjects, record patient visit entries, log adverse events, and track history logs.</p>
          <a routerLink="/subjects" class="btn-link">Manage Subject Cohort →</a>
        </div>

        <!-- Batch Manufacturing Card -->
        <div class="module-card" *ngIf="hasPermission('Batch Manufacturing')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
            </svg>
          </div>
          <h3>Batch Manufacturing</h3>
          <p>Monitor manufacturing progress, check raw material lists, run QC Tests, and release batches.</p>
          <a routerLink="/batches" class="btn-link">Inspect Batch Runs & QC →</a>
        </div>

        <!-- Deviations & CAPA Card -->
        <div class="module-card" *ngIf="hasPermission('Deviation & CAPA')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3>Deviations & CAPA</h3>
          <p>Document discrepancies, assign deviation codes, launch investigative workflows, and track CAPA corrective actions.</p>
          <a routerLink="/deviations" class="btn-link">Access Deviations Panel →</a>
        </div>

        <!-- Supply Chain Card -->
        <div class="module-card" *ngIf="hasPermission('Supply Chain')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <h3>Supply Chain & Cold Chain</h3>
          <p>Track shipment dispatches, manage site inventory status, and register sensor temperature readings.</p>
          <a routerLink="/supply-chain" class="btn-link">View Supply & Logistics →</a>
        </div>

        <!-- Regulatory Affairs Card -->
        <div class="module-card" *ngIf="hasPermission('Regulatory Affairs')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h3>Regulatory Affairs</h3>
          <p>Compile dossier codes, track regulatory milestones, submit dossiers, and record approval workflow events.</p>
          <a routerLink="/regulatory" class="btn-link">Go to Regulatory Dossiers →</a>
        </div>

        <!-- Audit Ledger Card -->
        <div class="module-card" *ngIf="hasPermission('Audit')">
          <div class="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3>Compliance & Audit Ledger</h3>
          <p>Verify data integrity, query the unalterable event database log, view metrics, and export compliance reports.</p>
          <a routerLink="/audit" class="btn-link">Access Audit Logs →</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      font-family: 'Inter', sans-serif;
    }
    .welcome-banner {
      background: #ffffff;
      padding: 32px 40px;
      border-radius: 14px;
      border: 1px solid #ece4dc;
      margin-bottom: 32px;
      text-align: left;
    }
    .welcome-banner h1 {
      font-family: 'Manrope', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: #211611;
      margin: 0 0 8px;
    }
    .welcome-banner p {
      color: #7a6a5e;
      font-size: 15px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      background: #fbe9de;
      color: #CE5200;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      border: 1px solid #ece4dc;
      text-transform: uppercase;
    }
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }
    .module-card {
      background: #ffffff;
      border: 1px solid #ece4dc;
      border-radius: 14px;
      padding: 28px;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .module-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px rgba(86, 34, 0, 0.08);
      border-color: #CE5200; /* Light Orange hover standard */
    }
    .card-icon {
      width: 46px; height: 46px;
      border-radius: 10px;
      background: #fbe9de;
      color: #CE5200;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .module-card h3 {
      font-family: 'Manrope', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #211611;
      margin: 0;
    }
    .module-card p {
      color: #7a6a5e;
      font-size: 13.5px;
      line-height: 1.5;
      margin: 0;
      flex-grow: 1;
    }
    .btn-link {
      color: #CE5200;
      font-weight: 700;
      text-decoration: none;
      font-size: 14px;
      align-self: flex-start;
      transition: color 0.15s ease;
    }
    .btn-link:hover {
      color: #562200;
      text-decoration: underline;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);

  userName = signal<string>('User');
  userRole = signal<string>('Staff');

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
