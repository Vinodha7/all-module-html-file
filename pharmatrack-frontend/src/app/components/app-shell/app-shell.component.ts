import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-shell">
      <!-- SIDEBAR -->
      <aside class="sidebar">
        <div>
          <div class="brand-row">
            <div class="brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
              </svg>
            </div>
            <div>
              <div class="brand-name">PharmaTrack</div>
              <div class="brand-sub">Compliance Platform</div>
            </div>
          </div>
        </div>

        <nav class="nav">
          <div class="nav-section">Main</div>
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Dashboard
          </a>

          <!-- Research / Investigation -->
          <div class="nav-section" *ngIf="showClinicalTrials() || showSubjects()">Trials & Subjects</div>
          <a class="nav-item" *ngIf="showClinicalTrials()" routerLink="/trials" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            Clinical Trials
          </a>
          <a class="nav-item" *ngIf="showSubjects()" routerLink="/subjects" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Subject Enrollment
          </a>

          <!-- Quality / Manufacturing -->
          <div class="nav-section" *ngIf="showBatches() || showDeviations()">Quality Operations</div>
          <a class="nav-item" *ngIf="showBatches()" routerLink="/batches" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
            Batch Manufacturing
          </a>
          <a class="nav-item" *ngIf="showDeviations()" routerLink="/deviations" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Deviations & CAPA
          </a>

          <!-- Supply Chain -->
          <div class="nav-section" *ngIf="showSupplyChain()">Supply Chain</div>
          <a class="nav-item" *ngIf="showSupplyChain()" routerLink="/supply-chain" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            Logistics & Cold Chain
          </a>

          <!-- Regulatory Affairs -->
          <div class="nav-section" *ngIf="showRegulatory()">Regulatory</div>
          <a class="nav-item" *ngIf="showRegulatory()" routerLink="/regulatory" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Regulatory Affairs
          </a>

          <!-- Auditing -->
          <div class="nav-section" *ngIf="showAudit()">Audit & Integrity</div>
          <a class="nav-item" *ngIf="showAudit()" routerLink="/audit" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>
            Compliance & Ledger
          </a>

          <!-- Administration -->
          <div class="nav-section" *ngIf="showAdmin()">Administration</div>
          <a class="nav-item" *ngIf="showAdmin()" routerLink="/users" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            User Management
          </a>
          <a class="nav-item" *ngIf="showAdmin()" routerLink="/signatures" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
            E-Signatures List
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div class="user-name-title">{{ userName() }}</div>
            <div class="user-role-badge">{{ userRole() }}</div>
          </div>
          <button class="logout-btn" (click)="handleLogout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>
      </aside>

      <!-- MAIN PANEL -->
      <main class="main">
        <header class="topbar">
          <div class="page-title">
            PharmaTrack Portal
          </div>
          
          <div class="topbar-actions">
            <!-- Notifications Bell -->
            <button class="bell-btn" routerLink="/notifications" aria-label="View notifications">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span class="badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>
            </button>
            
            <div class="user-avatar">
              {{ userInitials() }}
            </div>
          </div>
        </header>

        <!-- Dynamic Content Router Outlet -->
        <div class="content-body">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: #f7f5f2;
    }
    .sidebar {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      width: 264px;
      background: #2a1408; /* Theme match */
      padding: 30px 20px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      overflow-y: auto;
      z-index: 30;
      scrollbar-width: none;
    }
    .sidebar::-webkit-scrollbar {
      display: none;
    }
    .brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 32px; height: 32px;
      border-radius: 9px;
      background: #CE5200;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-name {
      font-family: 'Manrope', sans-serif;
      color: #fff;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-sub {
      color: #a98a72;
      font-size: 11.5px;
    }
    .nav {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex-grow: 1;
    }
    .nav-section {
      color: #a98a72;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 18px 0 6px 12px;
    }
    .nav-section:first-of-type {
      margin-top: 5px;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      color: #e8d3c4;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #CE5200; /* Light Orange hover standard */
    }
    .nav-item.active {
      background: #6b2f0f;
      color: #fff;
      font-weight: 600;
    }
    .sidebar-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .user-info {
      padding: 0 10px;
    }
    .user-name-title {
      color: #ffffff;
      font-size: 14.5px;
      font-weight: 600;
    }
    .user-role-badge {
      display: inline-block;
      margin-top: 4px;
      font-size: 11px;
      color: #e8d3c4;
      background: #6b2f0f;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .logout-btn {
      width: 100%;
      padding: 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #e8d3c4;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: inherit;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .logout-btn:hover {
      background: rgba(179, 38, 30, 0.15);
      border-color: #b3261e;
      color: #fff;
    }
    .main {
      margin-left: 264px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100vh;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 70px;
      background: #ffffff;
      border-bottom: 1px solid #ece4dc;
      padding: 0 32px;
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .page-title {
      font-family: 'Manrope', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: #211611;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .bell-btn {
      background: none;
      border: none;
      color: #7a6a5e;
      cursor: pointer;
      position: relative;
      padding: 4px;
      border-radius: 50%;
      transition: background 0.2s ease, color 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bell-btn:hover {
      background: #fbe9de;
      color: #CE5200;
    }
    .bell-btn .badge {
      position: absolute;
      top: -2px; right: -2px;
      background: #b3261e;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
      border: 2px solid #ffffff;
    }
    .user-avatar {
      width: 38px; height: 38px;
      border-radius: 50%;
      background: #fbe9de;
      color: #CE5200;
      font-weight: 700;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #ece4dc;
    }
    .content-body {
      padding: 32px;
      flex-grow: 1;
      overflow-y: auto;
    }
  `]
})
export class AppShellComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);

  userName = signal<string>('User');
  userRole = signal<string>('Staff');
  userInitials = signal<string>('U');
  unreadCount = signal<number>(0);

  private pollSubscription?: Subscription;

  ngOnInit() {
    this.updateUserContext();
    this.fetchUnreadNotificationsCount();

    // Poll unread notifications every 10 seconds for real-time bell badge
    this.pollSubscription = interval(10000).subscribe(() => {
      this.fetchUnreadNotificationsCount();
    });
  }

  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
  }

  updateUserContext() {
    const user = this.authService.currentUser();
    if (user) {
      this.userName.set(user.name || user.email);
      this.userRole.set(user.role || this.authService.role() || 'Staff');
      this.userInitials.set((user.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase());
    } else {
      this.authService.fetchCurrentUser().subscribe(usr => {
        if (usr) {
          this.userName.set(usr.name || usr.email);
          this.userRole.set(usr.role || this.authService.role() || 'Staff');
          this.userInitials.set((usr.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase());
        }
      });
    }
  }

  fetchUnreadNotificationsCount() {
    const userIdVal = localStorage.getItem('pt_userId');
    if (userIdVal) {
      this.apiService.getUnreadCount(userIdVal).subscribe({
        next: (count) => {
          this.unreadCount.set(count);
        },
        error: () => {}
      });
    }
  }

  handleLogout() {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  // Helper getters for navigation items RBAC
  showClinicalTrials(): boolean { return this.authService.hasPermission('Clinical Trials'); }
  showSubjects(): boolean { return this.authService.hasPermission('Subjects'); }
  showBatches(): boolean { return this.authService.hasPermission('Batch Manufacturing'); }
  showDeviations(): boolean { return this.authService.hasPermission('Deviation & CAPA'); }
  showSupplyChain(): boolean { return this.authService.hasPermission('Supply Chain'); }
  showRegulatory(): boolean { return this.authService.hasPermission('Regulatory Affairs'); }
  showAudit(): boolean { return this.authService.hasPermission('Audit'); }
  showAdmin(): boolean { return this.authService.hasPermission('Administration'); }
}
