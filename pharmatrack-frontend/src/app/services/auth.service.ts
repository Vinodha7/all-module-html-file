import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, map, catchError, of } from 'rxjs';

export interface LoginResponse {
  token: string;
  expiresIn: number;
  userId: number;
  role: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = 'http://localhost:8090/pharmaTrack/identityAccess/auth';

  // ---------------------------------------------------------------------------
  // DEV_BYPASS: lets the UI be viewed without the backend running (for UI/design
  // work). Seeds a mock Admin session so every screen is reachable. Set to false
  // to restore normal login against the backend.
  // ---------------------------------------------------------------------------
  private DEV_BYPASS = false;
  private DEV_USER = { userId: 1, name: 'Clinical Researcher', email: 'dev@pharmatrack.local', role: 'Researcher' };

  // Signals for state
  currentUser = signal<any>(null);
  token = signal<string | null>(localStorage.getItem('pt_token'));
  role = signal<string | null>(localStorage.getItem('pt_role'));

  // Sliding-session refresh timer (proactively refreshes the JWT before it expires).
  private refreshTimer: any = null;

  constructor() {
    if (this.DEV_BYPASS) {
      // Seed a fake session; skip the backend /me call entirely.
      this.token.set('dev-token');
      this.role.set(this.DEV_USER.role);
      this.currentUser.set(this.DEV_USER);
      localStorage.setItem('pt_token', 'dev-token');
      localStorage.setItem('pt_role', this.DEV_USER.role);
      localStorage.setItem('pt_userId', String(this.DEV_USER.userId));
      return;
    }
    if (this.token()) {
      this.fetchCurrentUser().subscribe();
      this.scheduleTokenRefresh();
    }
  }

  getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.token()}`
    });
  }

  login(email: string, password: string): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.data) {
          const data = res.data;
          this.token.set(data.token);
          this.role.set(data.role);
          localStorage.setItem('pt_token', data.token);
          localStorage.setItem('pt_role', data.role);
          localStorage.setItem('pt_userId', String(data.userId));
          this.fetchCurrentUser().subscribe();
          this.scheduleTokenRefresh();
        }
      })
    );
  }

  /**
   * Sliding session: exchange the current JWT for a fresh one via /auth/refresh.
   * Called proactively shortly before expiry (see scheduleTokenRefresh). On any
   * failure the session is cleared so the guard sends the user back to login.
   */
  refreshToken(): Observable<any> {
    if (!this.token()) return of(null);
    return this.http.post<ApiResponse<LoginResponse>>(`${this.baseUrl}/refresh`, {}, { headers: this.getHeaders() }).pipe(
      tap(res => {
        const data: any = res?.data;
        if (data?.token) {
          this.token.set(data.token);
          localStorage.setItem('pt_token', data.token);
          if (data.role) {
            this.role.set(data.role);
            localStorage.setItem('pt_role', data.role);
          }
          this.scheduleTokenRefresh();
        }
      }),
      catchError(() => { this.clearSession(); return of(null); })
    );
  }

  /** Schedule a refresh ~60s before the JWT's exp claim (min 5s out). */
  private scheduleTokenRefresh() {
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
    const t = this.token();
    if (!t) return;
    const expMs = this.jwtExpMs(t);
    if (!expMs) return;
    const now = Date.now();
    if (expMs <= now) { this.clearSession(); return; }
    const delay = Math.max(5000, expMs - now - 60000);
    this.refreshTimer = setTimeout(() => this.refreshToken().subscribe(), delay);
  }

  /** Read the `exp` claim (seconds) from a JWT and return it in ms, or null. */
  private jwtExpMs(token: string): number | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      return payload?.exp ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  logout(): Observable<ApiResponse<void>> {
    const tokenVal = this.token();
    const userIdVal = localStorage.getItem('pt_userId');
    const body = { token: tokenVal, userId: userIdVal ? parseInt(userIdVal, 10) : null };
    
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/logout`, body).pipe(
      tap(() => this.clearSession()),
      catchError(err => {
        this.clearSession();
        return of({ success: true, message: 'Logged out', data: undefined as any });
      })
    );
  }

  clearSession() {
    if (this.refreshTimer) { clearTimeout(this.refreshTimer); this.refreshTimer = null; }
    this.token.set(null);
    this.role.set(null);
    this.currentUser.set(null);
    localStorage.removeItem('pt_token');
    localStorage.removeItem('pt_role');
    localStorage.removeItem('pt_userId');
  }

  fetchCurrentUser(): Observable<any> {
    if (!this.token()) return of(null);
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/me`, { headers: this.getHeaders() }).pipe(
      map(res => {
        if (res.success) {
          this.currentUser.set(res.data);
          return res.data;
        }
        return null;
      }),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  forgotPassword(email: string): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/resetPassword`, {
      step: 'REQUEST',
      email
    });
  }

  verifyResetToken(token: string): Observable<ApiResponse<string>> {
    return this.http.get<ApiResponse<string>>(`${this.baseUrl}/verifyToken/${token}`);
  }

  resetPassword(token: string, newPassword: string, confirmPassword: string): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.baseUrl}/resetPassword`, {
      step: 'RESET',
      token,
      newPassword,
      confirmPassword
    });
  }

  isAuthenticated(): boolean {
    return !!this.token();
  }

  /**
   * Canonical RBAC role key. Descriptive role names created by admin
   * (e.g. "Clinical Researcher", "Principal Investigator officer") are mapped
   * to the app's canonical keys so permission checks work regardless of the
   * exact label chosen when the role was created.
   */
  normalizedRole(): string {
    const raw = this.role();
    if (!raw) return '';
    const key = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (key.includes('investigator')) return 'Investigator';
    if (key.includes('researcher')) return 'Researcher';
    return raw;
  }

  hasPermission(module: string): boolean {
    const userRole = this.normalizedRole();
    if (!userRole) return false;

    // Visibility Mapping as per prompt:
    switch (userRole) {
      case 'Admin':
        return [
          'Administration',
          'Dashboard',
          'Users',
          'Roles',
          'Permissions',
          'Products',
          'Sites',
          'Electronic Signatures',
          'Audit',
          'Audit Dashboard',
          'Audit Events',
          'Integrity Monitoring',
          'Reports'
        ].includes(module);
      // Notifications are business-domain alerts (Trial / Batch / ColdChain /
      // Deviation / Regulatory) raised for the operational roles that act on them.
      // Governance roles (Admin, Auditor) do not participate in these workflows.
      case 'Researcher':
      case 'Investigator':
        return ['Clinical Trials', 'Subjects', 'Notifications'].includes(module);
      case 'QAAnalyst':
      case 'QA Analyst':
        return ['Batch Manufacturing', 'Deviation & CAPA', 'Notifications'].includes(module);
      case 'ManufacturingSupervisor':
      case 'Manufacturing Supervisor':
        return ['Batch Manufacturing', 'Notifications'].includes(module);
      case 'SupplyChain':
      case 'Supply Chain':
        return ['Supply Chain', 'Notifications'].includes(module);
      case 'RegulatoryOfficer':
      case 'Regulatory Officer':
        return ['Regulatory Affairs', 'Notifications'].includes(module);
      default:
        return false;
    }
  }
}
