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
        }
      })
    );
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
      case 'Auditor':
        return [
          'Audit',
          'Audit Dashboard',
          'Audit Events',
          'Integrity Monitoring',
          'Reports'
        ].includes(module);
      case 'Researcher':
      case 'Investigator':
        return ['Clinical Trials', 'Subjects'].includes(module);
      case 'QAAnalyst':
      case 'QA Analyst':
        return ['Batch Manufacturing', 'Deviation & CAPA'].includes(module);
      case 'ManufacturingSupervisor':
      case 'Manufacturing Supervisor':
        return ['Batch Manufacturing'].includes(module);
      case 'SupplyChain':
      case 'Supply Chain':
        return ['Supply Chain'].includes(module);
      case 'RegulatoryOfficer':
      case 'Regulatory Officer':
        return ['Regulatory Affairs'].includes(module);
      default:
        return false;
    }
  }
}
