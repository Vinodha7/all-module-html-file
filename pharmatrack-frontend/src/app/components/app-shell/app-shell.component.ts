import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Subscription, interval } from 'rxjs';

interface NavItem {
  label: string;
  route: string;
  module?: string;   // RBAC key; undefined = always accessible
  icon: SafeHtml;
}
interface NavSection {
  title?: string;
  items: NavItem[];
}

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
          <ng-container *ngFor="let section of navSections">
            <div class="nav-section" *ngIf="section.title">{{ section.title }}</div>
            <!-- Every module looks identical; permission is checked only on click. -->
            <a class="nav-item" *ngFor="let item of section.items"
               [class.active]="isActive(item.route)"
               (click)="go(item, $event)"
               [attr.title]="tooltipFor(item)">
              <span class="nav-ico" [innerHTML]="item.icon"></span>
              <span>{{ item.label }}</span>
            </a>
          </ng-container>
        </nav>
      </aside>

      <!-- MAIN PANEL -->
      <main class="main">
        <header class="topbar">
          <div class="pill">{{ userRole() }}</div>

          <div class="topbar-right">
            <button class="icon-btn" *ngIf="canAccess('Notifications')" routerLink="/notifications" aria-label="Notifications">
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

        <div class="content">
          <router-outlet></router-outlet>
        </div>
      </main>

      <!-- Access-denied toast -->
      <div class="toast" *ngIf="toastMsg()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <span>{{ toastMsg() }}</span>
      </div>

      <!-- Sign-out confirmation -->
      <div class="modal-overlay confirm-overlay" *ngIf="showLogoutConfirm()">
        <div class="modal confirm-modal">
          <button type="button" class="modal-close-x" (click)="showLogoutConfirm.set(false)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Sign Out</h2>
          <p class="confirm-text">Are you sure you want to sign out?</p>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="confirmLogout()">Yes</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .app-shell { display: block; min-height: 100vh; }
    .main { flex: 1; width: auto; }
    /* Compact, uniformly-spaced sidebar that always fits with no scroll. */
    .sidebar { padding: 16px 14px; gap: 6px; overflow: hidden; }
    .brand-name { font-size: 20px; }
    .brand-sub { font-size: 12px; margin-top: 2px; }
    .nav { gap: 4px; justify-content: flex-start; }
    .nav-section { margin: 9px 0 1px 12px; font-size: 10px; }
    .nav-section:first-child { margin-top: 2px; }
    /* All items identical — no accessible/restricted visual distinction. */
    .nav-item { padding: 7px 12px; font-size: 13px; cursor: pointer; }
    .nav-ico { display: inline-flex; align-items: center; }
    .toast {
      position: fixed; bottom: 26px; right: 26px; z-index: 200;
      background: #211611; color: #fff;
      padding: 13px 18px; border-radius: 11px;
      box-shadow: 0 14px 34px rgba(30,16,8,.32);
      font-size: 13.5px; font-weight: 500;
      display: flex; align-items: center; gap: 11px; max-width: 380px;
      animation: toast-in .18s ease;
    }
    .toast svg { flex-shrink: 0; color: #ffb27a; }
    .confirm-modal { max-width: 440px; }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  `]
})
export class AppShellComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private apiService = inject(ApiService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  userName = signal<string>('User');
  userRole = signal<string>('Staff');
  userInitials = signal<string>('U');
  unreadCount = signal<number>(0);
  userMenuOpen = signal<boolean>(false);
  toastMsg = signal<string | null>(null);
  showLogoutConfirm = signal<boolean>(false);

  private pollSubscription?: Subscription;
  private toastTimer?: any;

  navSections: NavSection[] = [
    { items: [
      this.item('Dashboard', '/dashboard', undefined,
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>')
    ]},
    { title: 'Operations', items: [
      this.item('Clinical Trials', '/trials', 'Clinical Trials',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/></svg>'),
      this.item('Subjects & Visits', '/subjects', 'Subjects',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/></svg>'),
      this.item('Batch Manufacturing', '/batches', 'Batch Manufacturing',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>'),
      this.item('Supply Chain', '/supply-chain', 'Supply Chain',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h13v13H1z"/><path d="M14 8h4l4 4v4h-8V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/></svg>')
    ]},
    { title: 'Quality & Compliance', items: [
      this.item('Deviations & CAPA', '/deviations', 'Deviation & CAPA',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'),
      this.item('Regulatory Affairs', '/regulatory', 'Regulatory Affairs',
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>')
    ]},
    { title: 'Monitoring', items: [
      this.item('Notifications', '/notifications', 'Notifications',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>')
    ]},
    { title: 'Administration', items: [
      this.item('Users', '/users', 'Users',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'),
      this.item('Products', '/products', 'Products',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg>'),
      this.item('Sites', '/sites', 'Sites',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.686-6-10a6 6 0 0 1 12 0c0 4.314-6 10-6 10Z"/><circle cx="12" cy="11" r="2"/></svg>'),
      this.item('E-Signatures', '/signatures', 'Electronic Signatures',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M3 21h18"/></svg>'),
      this.item('Audit Trail', '/audit', 'Audit',
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>')
    ]}
  ];

  private item(label: string, route: string, module: string | undefined, icon: string): NavItem {
    return { label, route, module, icon: this.sanitizer.bypassSecurityTrustHtml(icon) };
  }

  /** Meaningful per-item hover tooltips (restricted items explain why). */
  private readonly TOOLTIPS: Record<string, string> = {
    'Dashboard': 'Go to Dashboard',
    'Clinical Trials': 'Clinical Trial Management',
    'Subjects & Visits': 'Subject Enrollment & Visits',
    'Batch Manufacturing': 'Batch Manufacturing',
    'Supply Chain': 'Supply Chain & Cold Chain',
    'Deviations & CAPA': 'Deviations & CAPA',
    'Regulatory Affairs': 'Regulatory Affairs',
    'Notifications': 'Notifications & Alerts',
    'Users': 'User Administration',
    'Products': 'Product Management',
    'Sites': 'Site Management',
    'E-Signatures': 'Electronic Signatures',
    'Audit Trail': 'Audit Trail'
  };

  /** Tooltip text, or null so [attr.title] removes the attribute entirely (never "null"). */
  tooltipFor(item: NavItem): string | null {
    if (!this.canAccess(item.module)) return 'Access restricted for your role.';
    return this.TOOLTIPS[item.label] ?? null;
  }

  /** Every logged-in user reaches module-less items (Dashboard, Notifications). */
  canAccess(module?: string): boolean {
    if (!module) return true;
    return this.authService.hasPermission(module);
  }

  /** Highlight the item for the current route (no routerLink is used). */
  isActive(route: string): boolean {
    const url = this.router.url.split('?')[0];
    if (route === '/dashboard') return url === '/' || url === '/dashboard';
    return url === route || url.startsWith(route + '/');
  }

  /** Permission is enforced here, on click — never via visual styling. */
  go(item: NavItem, event: Event) {
    event.preventDefault();
    if (this.canAccess(item.module)) {
      this.router.navigate([item.route]);
    } else {
      this.denyAccess();
    }
  }

  denyAccess() {
    this.toastMsg.set('Access denied. You do not have permission to access this module.');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastMsg.set(null), 3200);
  }

  ngOnInit() {
    this.updateUserContext();
    this.fetchUnreadNotificationsCount();
    this.pollSubscription = interval(10000).subscribe(() => this.fetchUnreadNotificationsCount());
  }

  ngOnDestroy() {
    this.pollSubscription?.unsubscribe();
    clearTimeout(this.toastTimer);
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen.update(v => !v);
  }

  updateUserContext() {
    const user = this.authService.currentUser();
    if (user) {
      this.applyUser(user);
    } else {
      this.authService.fetchCurrentUser().subscribe(usr => { if (usr) this.applyUser(usr); });
    }
  }

  private applyUser(u: any) {
    this.userName.set(u.name || u.email);
    this.userRole.set(u.role || this.authService.role() || 'Staff');
    this.userInitials.set((u.name || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase());
  }

  fetchUnreadNotificationsCount() {
    if (!this.canAccess('Notifications')) return;
    const userIdVal = localStorage.getItem('pt_userId');
    if (userIdVal) {
      this.apiService.getUnreadCount(userIdVal).subscribe({
        next: (count) => this.unreadCount.set(count),
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
    this.showLogoutConfirm.set(true);
  }

  confirmLogout() {
    this.showLogoutConfirm.set(false);
    this.authService.logout().subscribe(() => this.router.navigate(['/login']));
  }
}
