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
        <div class="brand">
          <div class="brand-row">
            <span class="brand-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l7 4v6c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-4z"/><path d="M9 12l2 2 4-4"/></svg>
            </span>
            <div class="brand-name">PharmaTrack</div>
          </div>
          <div class="brand-sub">Drug Trial &amp; Supply Chain</div>
        </div>

        <nav class="nav">
          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
            <span>Dashboard</span>
          </a>

          <!-- Operations -->
          <div class="nav-section">Operations</div>
          <a class="nav-item" routerLink="/trials" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/></svg>
            <span>Clinical Trials</span>
          </a>
          <a class="nav-item" routerLink="/subjects" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>
            <span>Subjects &amp; Visits</span>
          </a>
          <a class="nav-item" routerLink="/batches" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>
            <span>Batch Manufacturing</span>
          </a>
          <a class="nav-item" routerLink="/supply-chain" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h13v13H1z"/><path d="M14 8h4l4 4v4h-8V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/></svg>
            <span>Supply Chain</span>
          </a>

          <!-- Quality & Compliance -->
          <div class="nav-section">Quality &amp; Compliance</div>
          <a class="nav-item" routerLink="/deviations" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>
            <span>Deviations &amp; CAPA</span>
          </a>
          <a class="nav-item" routerLink="/regulatory" routerLinkActive="active">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
            <span>Regulatory Affairs</span>
          </a>

          <!-- Monitoring -->
          <div class="nav-section">Monitoring</div>
          <a class="nav-item" routerLink="/notifications" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            <span>Notifications &amp; Alerts</span>
          </a>

          <!-- Administration -->
          <div class="nav-section">Administration</div>
          <a class="nav-item" routerLink="/users" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Users</span>
          </a>
          <a class="nav-item" routerLink="/products" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>
            <span>Products</span>
          </a>
          <a class="nav-item" routerLink="/sites" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.686-6-10a6 6 0 0 1 12 0c0 4.314-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/></svg>
            <span>Sites</span>
          </a>
          <a class="nav-item" routerLink="/signatures" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M3 21h18"/></svg>
            <span>E-Signatures</span>
          </a>
          <a class="nav-item" routerLink="/audit" routerLinkActive="active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span>Audit Trail</span>
          </a>
        </nav>
      </aside>

      <!-- MAIN PANEL -->
      <main class="main">
        <header class="topbar">
          <div class="pill">{{ userRole() }}</div>

          <div class="topbar-right">
            <!-- Notifications Bell -->
            <button class="icon-btn" routerLink="/notifications" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span class="badge" *ngIf="unreadCount() > 0">{{ unreadCount() }}</span>
            </button>

            <div class="dropdown">
              <div class="user-chip" (click)="toggleUserMenu($event)">
                <div class="avatar">{{ userInitials() }}</div>
                <div class="user-meta">
                  <div class="user-name">{{ userName() }}</div>
                  <div class="user-role">{{ userRole() }}</div>
                </div>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
              <div class="dropdown-menu dropdown-menu-right" [class.open]="userMenuOpen()">
                <button type="button" class="dropdown-item" (click)="goProfile()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
                  Profile
                </button>
                <button type="button" class="dropdown-item" (click)="handleLogout()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Dynamic Content Router Outlet -->
        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-shell { display: block; min-height: 100vh; }
    /* Sidebar is position:fixed (out of flow); .main fills everything to the right of it. */
    .main { flex: 1; width: auto; }
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
  userMenuOpen = signal<boolean>(false);

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

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen.update(v => !v);
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

  goProfile() {
    this.userMenuOpen.set(false);
    this.router.navigate(['/profile']);
  }

  handleLogout() {
    this.userMenuOpen.set(false);
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
  showProducts(): boolean { return this.authService.hasPermission('Products'); }
  showSites(): boolean { return this.authService.hasPermission('Sites'); }
}
