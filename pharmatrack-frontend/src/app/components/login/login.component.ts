import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <!-- Brand -->
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l7 4v6c0 4.5-3 7.5-7 10-4-2.5-7-5.5-7-10V6l7-4z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </span>
          <div class="brand-name">PharmaTrack</div>

          <!-- Tab Subtitles -->
          <div class="brand-sub" *ngIf="viewMode() === 'login'">Sign in to continue</div>
          <div class="brand-sub" *ngIf="viewMode() === 'forgot'">Recover your account password</div>
          <div class="brand-sub" *ngIf="viewMode() === 'reset'">Set your new secure password</div>
        </div>

        <!-- Alert messages (reserved slot so the card never resizes) -->
        <div class="alert-slot">
          <div class="alert alert-error" *ngIf="errorMsg()">
            {{ errorMsg() }}
          </div>
          <div class="alert alert-success" *ngIf="successMsg()">
            {{ successMsg() }}
          </div>
        </div>

        <!-- 1. LOGIN FORM -->
        <form *ngIf="viewMode() === 'login'" (ngSubmit)="handleLogin()" novalidate>
          <div class="login-field">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@pharmatrack.com"
              autocomplete="username"
              #emailModel="ngModel"
              [(ngModel)]="email"
              required
              email
              [class.invalid]="(emailModel.touched || submitted()) && emailModel.invalid">
            <div class="field-error" *ngIf="(emailModel.touched || submitted()) && emailModel.errors?.['required']">Email is required.</div>
            <div class="field-error" *ngIf="(emailModel.touched || submitted()) && emailModel.errors?.['email'] && !emailModel.errors?.['required']">Enter a valid email address.</div>
          </div>

          <div class="login-field">
            <label for="password">Password</label>
            <div class="password-wrap">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="password"
                name="password"
                placeholder="Enter your password"
                autocomplete="current-password"
                #passwordModel="ngModel"
                [(ngModel)]="password"
                required
                [class.invalid]="(passwordModel.touched || submitted()) && passwordModel.invalid">
              <button type="button" class="password-toggle" (click)="togglePassword()" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
                <!-- Single eye icon toggles dynamically -->
                <svg *ngIf="!showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            <div class="field-error" *ngIf="(passwordModel.touched || submitted()) && passwordModel.errors?.['required']">Password is required.</div>
          </div>

          <div class="row-between">
            <label class="login-checkbox">
              <input type="checkbox" name="rememberMe" [(ngModel)]="rememberMe"> Remember me
            </label>
            <a class="login-link" routerLink="/forgot-password">Forgot password?</a>
          </div>

          <button type="submit" class="btn-signin" [disabled]="loading()">
            <svg *ngIf="!loading()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span *ngIf="loading()">Signing in...</span>
            <span *ngIf="!loading()">Sign In</span>
          </button>
        </form>

        <!-- 2. FORGOT PASSWORD FORM -->
        <form *ngIf="viewMode() === 'forgot'" (ngSubmit)="handleForgotPassword()" novalidate>
          <div class="login-field">
            <label for="forgotEmail">Email Address</label>
            <input
              type="email"
              id="forgotEmail"
              name="forgotEmail"
              placeholder="you@pharmatrack.com"
              autocomplete="username"
              #forgotEmailModel="ngModel"
              [(ngModel)]="email"
              required
              email
              [class.invalid]="(forgotEmailModel.touched || submitted()) && forgotEmailModel.invalid">
            <div class="field-error" *ngIf="(forgotEmailModel.touched || submitted()) && forgotEmailModel.errors?.['required']">Email is required.</div>
            <div class="field-error" *ngIf="(forgotEmailModel.touched || submitted()) && forgotEmailModel.errors?.['email'] && !forgotEmailModel.errors?.['required']">Enter a valid email address.</div>
          </div>

          <button type="submit" class="btn-signin" [disabled]="loading()">
            <span *ngIf="loading()">Sending...</span>
            <span *ngIf="!loading()">Send Reset Link</span>
          </button>

          <div class="form-foot">
            <a class="login-link" routerLink="/login">Back to Login</a>
          </div>
        </form>

        <!-- 3. RESET PASSWORD FORM -->
        <form *ngIf="viewMode() === 'reset'" (ngSubmit)="handleResetPassword()" novalidate>
          <div class="login-field">
            <label for="newPassword">New Password</label>
            <div class="password-wrap">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                id="newPassword"
                name="newPassword"
                placeholder="Enter new password"
                autocomplete="new-password"
                [(ngModel)]="newPassword"
                (ngModelChange)="validateCriteria()"
                required>
              <button type="button" class="password-toggle" (click)="togglePassword()" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'">
                <svg *ngIf="!showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showPassword()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5.06-6.06M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>

            <!-- Criteria check -->
            <div class="password-criteria">
              <div [class.met]="hasMinLength()">Min 8 characters</div>
              <div [class.met]="hasUppercase()">At least 1 uppercase letter</div>
              <div [class.met]="hasNumber()">At least 1 number</div>
              <div [class.met]="hasSymbol()">At least 1 symbol</div>
            </div>
          </div>

          <div class="login-field">
            <label for="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Confirm new password"
              autocomplete="new-password"
              [(ngModel)]="confirmPassword"
              required>
          </div>

          <button type="submit" class="btn-signin" [disabled]="loading() || !criteriaMet()">
            <span *ngIf="loading()">Resetting...</span>
            <span *ngIf="!loading()">Reset Password</span>
          </button>

          <div class="form-foot">
            <a class="login-link" routerLink="/login">Cancel</a>
          </div>
        </form>

        <!-- Access note -->
        <div class="divider-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Protected environment. Access is logged and audited.
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .login-wrapper {
      position: fixed;
      inset: 0;
      z-index: 100;
      overflow: hidden;              /* never scroll — fit on one screen */
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      font-family: 'Inter', system-ui, sans-serif;
      color: var(--text, #211611);
      background:
        radial-gradient(circle at 15% 15%, rgba(255,255,255,.06), transparent 40%),
        linear-gradient(135deg, var(--sidebar-bg, #2a1408) 0%, var(--accent-dark, #562200) 60%, var(--accent, #CE5200) 100%);
    }
    .login-card {
      width: 100%;
      max-width: 430px;
      background: var(--card, #ffffff);
      border-radius: 18px;
      box-shadow: 0 30px 70px rgba(30, 16, 8, 0.35);
      padding: 32px 38px 28px;
    }
    .brand {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 10px;
    }
    .brand-mark {
      width: 44px;
      height: 44px;
      border-radius: 13px;
      background: var(--accent, #CE5200);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }
    .brand-mark svg {
      width: 24px;
      height: 24px;
    }
    .brand-name {
      font-family: 'Manrope', sans-serif;
      font-size: 23px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text, #211611);
    }
    .brand-sub {
      margin-top: 5px;
      font-size: 13px;
      color: var(--text-dim, #7a6a5e);
    }
    .login-field {
      text-align: left;
      margin-bottom: 34px;      /* generous room for the absolute field-error below */
      position: relative;
    }
    .login-field label {
      display: block;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text, #211611);
      margin-bottom: 7px;
    }
    .login-field input {
      width: 100%;
      height: 44px;
      padding: 0 14px;
      border: 1px solid var(--border, #ece4dc);
      border-radius: 9px;
      font-size: 14.5px;
      font-family: inherit;
      color: var(--text, #211611);
      background: #fff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .login-field input::placeholder {
      color: #a7b0aa;
    }
    .login-field input:focus {
      outline: none;
      border-color: var(--accent, #CE5200);
      box-shadow: 0 0 0 3px rgba(206, 82, 0, 0.18);
    }
    /* Inline validation state */
    .login-field input.invalid {
      border-color: var(--danger, #b3261e);
      box-shadow: 0 0 0 3px rgba(179, 38, 30, 0.14);
    }
    /* Absolutely positioned in the reserved margin so showing an error never
       resizes the field or the card. */
    .field-error {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 8px;
      font-size: 12.5px;
      line-height: 1.3;
      font-weight: 500;
      color: var(--danger, #b3261e);
      text-align: left;
    }
    .password-wrap {
      position: relative;
    }
    .password-wrap input {
      padding-right: 44px;
    }
    .password-toggle {
      position: absolute;
      top: 50%;
      right: 4px;
      transform: translateY(-50%);
      width: 38px;
      height: 38px;
      border: none;
      background: none;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-dim, #7a6a5e);
      border-radius: 7px;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .password-toggle:hover {
      background: #f2f5f3;
      color: var(--text, #211611);
    }
    .password-toggle svg {
      width: 19px;
      height: 19px;
    }
    .row-between {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 2px 0 16px;
    }
    .login-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--text-dim, #7a6a5e);
      cursor: pointer;
      user-select: none;
    }
    .login-checkbox input {
      width: 15px;
      height: 15px;
      accent-color: var(--accent, #CE5200);
      cursor: pointer;
    }
    .login-link {
      font-size: 13px;
      font-weight: 600;
      color: var(--accent-dark, #562200);
      text-decoration: none;
      cursor: pointer;
    }
    .login-link:hover {
      text-decoration: underline;
    }
    .btn-signin {
      width: 100%;
      height: 44px;
      border: none;
      border-radius: 9px;
      background: var(--accent, #CE5200);
      color: #fff;
      font-size: 14.5px;
      font-weight: 700;
      font-family: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .btn-signin:hover:not(:disabled) {
      background: var(--accent-dark, #562200);
    }
    .btn-signin:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-signin svg {
      width: 17px;
      height: 17px;
    }
    .form-foot {
      margin-top: 16px;
      text-align: center;
    }
    .divider-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 16px;
      color: var(--text-dim, #7a6a5e);
      font-size: 12px;
    }
    .divider-note svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
    /* Reserved space for the top alert so it never grows the card. */
    .alert-slot {
      min-height: 30px;
      margin-bottom: 4px;
      display: flex;
      align-items: stretch;
    }
    .alert {
      padding: 10px 14px;
      border-radius: 9px;
      margin-bottom: 0;
      width: 100%;
      font-size: 13px;
      text-align: left;
    }
    .alert-error {
      background: #fbeceb;
      color: var(--danger, #b3261e);
      border: 1px solid #f5c2c0;
    }
    .alert-success {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }
    .password-criteria {
      margin-top: 10px;
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .password-criteria div {
      position: relative;
      padding-left: 18px;
      color: var(--text-dim, #7a6a5e);
      transition: color 0.15s ease;
    }
    .password-criteria div::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #c7cdc9;
    }
    .password-criteria div.met {
      color: #2e7d32;
      font-weight: 500;
    }
    .password-criteria div.met::before {
      background: #2e7d32;
    }
    @media (max-width: 420px) {
      .login-card {
        padding: 24px 22px 20px;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  viewMode = signal<'login' | 'forgot' | 'reset'>('login');
  loading = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  submitted = signal<boolean>(false);

  // Inputs
  email = '';
  password = '';
  rememberMe = false;

  newPassword = '';
  confirmPassword = '';
  resetToken = '';

  showPassword = signal<boolean>(false);

  // Password criteria indicators
  hasMinLength = signal<boolean>(false);
  hasUppercase = signal<boolean>(false);
  hasNumber = signal<boolean>(false);
  hasSymbol = signal<boolean>(false);
  criteriaMet = signal<boolean>(false);

  ngOnInit() {
    this.route.url.subscribe(urlSegments => {
      const path = urlSegments[0]?.path;
      if (path === 'forgot-password') {
        this.viewMode.set('forgot');
      } else if (path === 'reset-password') {
        this.viewMode.set('reset');
        this.resetToken = this.route.snapshot.queryParams['token'] || '';
        if (!this.resetToken) {
          this.errorMsg.set('Invalid or missing password reset token.');
        }
      } else {
        this.viewMode.set('login');
      }
      this.submitted.set(false);
      this.clearMessages();
    });
  }

  clearMessages() {
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  validateCriteria() {
    const pwd = this.newPassword;
    this.hasMinLength.set(pwd.length >= 8);
    this.hasUppercase.set(/[A-Z]/.test(pwd));
    this.hasNumber.set(/[0-9]/.test(pwd));
    this.hasSymbol.set(/[^A-Za-z0-9]/.test(pwd));

    this.criteriaMet.set(
      this.hasMinLength() &&
      this.hasUppercase() &&
      this.hasNumber() &&
      this.hasSymbol()
    );
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  handleLogin() {
    this.submitted.set(true);
    this.clearMessages();

    // Inline field validation gates the request (see red messages under each field)
    if (!this.email || !this.isValidEmail(this.email) || !this.password) {
      return;
    }

    this.loading.set(true);
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMsg.set(res.message);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Authentication failed. Please verify your connection.');
      }
    });
  }

  handleForgotPassword() {
    this.submitted.set(true);
    this.clearMessages();
    if (!this.email || !this.isValidEmail(this.email)) {
      return;
    }

    this.loading.set(true);
    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          // No email server in this environment: the backend returns the reset
          // token (dev mode) either in `data` or as a "RESET_TOKEN::<token>" message
          // marker. If present, take the user straight to the set-new-password step.
          const marker = 'RESET_TOKEN::';
          const msg = res.message || '';
          let token: string = (res.data as any) || '';
          if (!token && msg.startsWith(marker)) token = msg.substring(marker.length);

          if (token) {
            this.resetToken = token;
            this.newPassword = '';
            this.confirmPassword = '';
            this.submitted.set(false);
            this.validateCriteria();
            this.viewMode.set('reset');
            this.successMsg.set('Verified. Set your new password below.');
          } else {
            this.successMsg.set(msg || 'Password reset link sent to your email.');
          }
        } else {
          this.errorMsg.set(res.message);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to submit reset request.');
      }
    });
  }

  handleResetPassword() {
    this.submitted.set(true);
    this.clearMessages();
    if (this.newPassword !== this.confirmPassword) {
      this.errorMsg.set('Passwords do not match.');
      return;
    }
    if (!this.criteriaMet()) {
      this.errorMsg.set('Password does not meet the complexity criteria.');
      return;
    }

    this.loading.set(true);
    this.authService.resetPassword(this.resetToken, this.newPassword, this.confirmPassword).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.successMsg.set('Password updated successfully! Redirecting to login in 3 seconds...');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 3000);
        } else {
          this.errorMsg.set(res.message);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Failed to reset password.');
      }
    });
  }
}
