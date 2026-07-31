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
        <!-- Logo -->
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
          </svg>
        </div>

        <div class="brand-name">PharmaTrack</div>
        
        <!-- Tab Subtitles -->
        <div class="brand-sub" *ngIf="viewMode() === 'login'">Sign in to continue</div>
        <div class="brand-sub" *ngIf="viewMode() === 'forgot'">Recover your account password</div>
        <div class="brand-sub" *ngIf="viewMode() === 'reset'">Set your new secure password</div>

        <!-- Alert messages -->
        <div class="alert alert-error" *ngIf="errorMsg()">
          {{ errorMsg() }}
        </div>
        <div class="alert alert-success" *ngIf="successMsg()">
          {{ successMsg() }}
        </div>

        <!-- 1. LOGIN FORM -->
        <form *ngIf="viewMode() === 'login'" (ngSubmit)="handleLogin()">
          <div class="field">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              placeholder="Enter your email" 
              [(ngModel)]="email" 
              required>
          </div>
          
          <div class="field">
            <label for="password">Password</label>
            <div class="password-wrap">
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                id="password" 
                name="password"
                placeholder="Enter your password" 
                [(ngModel)]="password" 
                required>
              <button type="button" class="eye-btn" (click)="togglePassword()" aria-label="Toggle password visibility">
                <!-- Single eye icon toggles dynamically -->
                <svg *ngIf="!showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="row-between">
            <label class="remember">
              <input type="checkbox" name="rememberMe" [(ngModel)]="rememberMe"> Remember me
            </label>
            <a class="forgot-link" routerLink="/forgot-password">Forgot password?</a>
          </div>

          <button type="submit" class="btn-signin" [disabled]="loading()">
            <svg *ngIf="!loading()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
            <span *ngIf="loading()">Signing in...</span>
            <span *ngIf="!loading()">Sign In</span>
          </button>
        </form>

        <!-- 2. FORGOT PASSWORD FORM -->
        <form *ngIf="viewMode() === 'forgot'" (ngSubmit)="handleForgotPassword()">
          <div class="field">
            <label for="forgotEmail">Email Address</label>
            <input 
              type="email" 
              id="forgotEmail" 
              name="forgotEmail"
              placeholder="Enter your email address" 
              [(ngModel)]="email" 
              required>
          </div>

          <button type="submit" class="btn-signin" [disabled]="loading()">
            <span *ngIf="loading()">Sending...</span>
            <span *ngIf="!loading()">Send Reset Link</span>
          </button>

          <div style="margin-top: 18px;">
            <a class="forgot-link" routerLink="/login">Back to Login</a>
          </div>
        </form>

        <!-- 3. RESET PASSWORD FORM -->
        <form *ngIf="viewMode() === 'reset'" (ngSubmit)="handleResetPassword()">
          <div class="field">
            <label for="newPassword">New Password</label>
            <div class="password-wrap">
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                id="newPassword" 
                name="newPassword"
                placeholder="Enter new password" 
                [(ngModel)]="newPassword" 
                (ngModelChange)="validateCriteria()"
                required>
              <button type="button" class="eye-btn" (click)="togglePassword()">
                <svg *ngIf="!showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                <svg *ngIf="showPassword()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
            
            <!-- Criteria check -->
            <div class="password-criteria">
              <div [class.met]="hasMinLength()">✓ Min 8 characters</div>
              <div [class.met]="hasUppercase()">✓ At least 1 uppercase letter</div>
              <div [class.met]="hasNumber()">✓ At least 1 number</div>
              <div [class.met]="hasSymbol()">✓ At least 1 symbol</div>
            </div>
          </div>

          <div class="field">
            <label for="confirmPassword">Confirm New Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword"
              placeholder="Confirm new password" 
              [(ngModel)]="confirmPassword" 
              required>
          </div>

          <button type="submit" class="btn-signin" [disabled]="loading() || !criteriaMet()">
            <span *ngIf="loading()">Resetting...</span>
            <span *ngIf="!loading()">Reset Password</span>
          </button>
          
          <div style="margin-top: 18px;">
            <a class="forgot-link" routerLink="/login">Cancel</a>
          </div>
        </form>

        <!-- Access note -->
        <div class="protected-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Protected environment. Access is logged and audited
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #562200 0%, #CE5200 100%);
      font-family: 'Inter', sans-serif;
    }
    .login-card {
      background: #ffffff;
      width: 100%;
      max-width: 440px;
      margin: 40px 20px;
      border-radius: 16px;
      padding: 44px 40px 36px;
      box-shadow: 0 30px 70px rgba(30, 16, 8, 0.35);
      text-align: center;
    }
    .logo {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #CE5200;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 18px;
    }
    .brand-name {
      font-family: 'Manrope', sans-serif;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #211611;
      margin-bottom: 4px;
    }
    .brand-sub {
      color: #7a6a5e;
      font-size: 14.5px;
      margin-bottom: 32px;
    }
    .field {
      text-align: left;
      margin-bottom: 20px;
    }
    .field label {
      display: block;
      font-size: 13.5px;
      font-weight: 700;
      margin-bottom: 9px;
      color: #211611;
    }
    .field input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #ece4dc;
      border-radius: 8px;
      font-size: 14.5px;
      font-family: inherit;
      background: #ffffff;
      color: #211611;
      outline: none;
      transition: border-color 0.2s ease;
    }
    .field input:focus {
      border-color: #CE5200;
    }
    .password-wrap {
      position: relative;
    }
    .password-wrap input {
      padding-right: 44px;
    }
    .eye-btn {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: #7a6a5e;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
    }
    .eye-btn:hover {
      color: #CE5200;
    }
    .row-between {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: -6px 0 24px;
      font-size: 13.5px;
    }
    .remember {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #7a6a5e;
      cursor: pointer;
    }
    .remember input {
      width: 16px;
      height: 16px;
      accent-color: #CE5200;
      cursor: pointer;
    }
    .forgot-link {
      color: #562200;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }
    .forgot-link:hover {
      text-decoration: underline;
      color: #CE5200;
    }
    .btn-signin {
      width: 100%;
      padding: 13px;
      border: none;
      border-radius: 8px;
      background: #CE5200;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      font-family: inherit;
      transition: background 0.2s ease;
    }
    .btn-signin:hover:not(:disabled) {
      background: #562200;
    }
    .btn-signin:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .protected-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      margin-top: 24px;
      color: #7a6a5e;
      font-size: 12px;
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
    .password-criteria {
      margin-top: 10px;
      font-size: 12px;
      color: #7a6a5e;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .password-criteria div {
      color: #b3261e;
    }
    .password-criteria div.met {
      color: #2e7d32;
      font-weight: 500;
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

  handleLogin() {
    this.clearMessages();
    
    // Perform simple validation on password before sending
    if (this.password.length < 8 || !/[A-Z]/.test(this.password) || !/[0-9]/.test(this.password) || !/[^A-Za-z0-9]/.test(this.password)) {
      this.errorMsg.set('Invalid credentials format. Check password requirements.');
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
    this.clearMessages();
    if (!this.email) {
      this.errorMsg.set('Please provide a valid email address.');
      return;
    }
    
    this.loading.set(true);
    this.authService.forgotPassword(this.email).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success) {
          this.successMsg.set(res.message || 'Password reset link sent to your email.');
          // Simulate clicking link: automatically output the token in console for convenience
          console.log(`Password reset link: http://localhost:4200/reset-password?token=${res.data}`);
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
