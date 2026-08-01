import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-page">
      <div class="page-head">
        <div>
          <h1 class="page-title">My Profile</h1>
          <div class="page-sub">Your account details and session information</div>
        </div>
        <span class="pill status-pill">{{ status() }}</span>
      </div>

      <div class="form-card profile-card">
        <div class="profile-top">
          <div class="avatar-lg">{{ initials() }}</div>
          <div>
            <div class="profile-name">{{ name() }}</div>
            <div class="profile-role">{{ role() }} · Site {{ siteId() }}</div>
          </div>
        </div>

        <div class="section-heading sh">Account Details</div>
        <div class="form-grid">
          <div class="field"><label>Full Name</label><input type="text" [value]="name()" readonly></div>
          <div class="field"><label>Email</label><input type="text" [value]="email()" readonly></div>
          <div class="field"><label>Phone</label><input type="text" [value]="phone()" readonly></div>
          <div class="field"><label>Role</label><input type="text" [value]="role()" readonly></div>
          <div class="field"><label>Site ID</label><input type="text" [value]="siteId()" readonly></div>
          <div class="field"><label>Account Status</label><input type="text" [value]="status()" readonly></div>
        </div>

        <div class="section-heading sh">Security &amp; Session</div>
        <div class="form-grid">
          <div class="field"><label>Last Sign-in</label><input type="text" [value]="lastSignIn" readonly></div>
          <div class="field"><label>Last Sign-in IP</label><input type="text" [value]="lastIp" readonly></div>
          <div class="field"><label>Password Last Changed</label><input type="text" [value]="pwdChanged" readonly></div>
        </div>

        <div class="form-footer profile-footer">
          <button type="button" class="btn btn-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Change Password
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    /* Compact so the whole card fits one screen without scrolling */
    .profile-page { }
    .page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
    .status-pill { align-self: center; font-size: 13.5px; padding: 8px 20px; border-radius: 24px; }
    .profile-card { max-width: 780px; padding: 20px 30px; }
    .profile-top { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
    .avatar-lg {
      width: 54px; height: 54px; border-radius: 50%; flex-shrink: 0;
      background: var(--accent); color: #fff; font-weight: 700; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
    }
    .profile-name { font-size: 18px; font-weight: 800; color: var(--text); }
    .profile-role { font-size: 13px; color: var(--text-dim); margin-top: 2px; }
    .sh { font-size: 13.5px; margin: 2px 0 10px; }
    .profile-card .form-grid { gap: 12px 28px; margin-bottom: 14px; }
    .profile-card .field label { margin-bottom: 5px; font-size: 13px; }
    .profile-card .field input { padding: 9px 12px; background: #f7f8f7; color: var(--text-dim); cursor: default; }
    .profile-footer { display: flex; justify-content: flex-end; border-top: 1px solid var(--border); padding-top: 14px; }
  `]
})
export class ProfileComponent {
  private auth = inject(AuthService);

  name = () => this.auth.currentUser()?.name || 'User';
  email = () => this.auth.currentUser()?.email || '—';
  phone = () => this.auth.currentUser()?.phone || '—';
  role = () => this.auth.role() || this.auth.currentUser()?.role || '—';
  siteId = () => this.auth.currentUser()?.siteId ?? '—';
  status = () => this.auth.currentUser()?.status || 'Active';
  initials = () => (this.name() || 'U').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  // Session details are not exposed by the current /me endpoint.
  lastSignIn = '—';
  lastIp = '—';
  pwdChanged = '—';
}
