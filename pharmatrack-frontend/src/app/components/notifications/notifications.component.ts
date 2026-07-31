import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content">
      <div class="page-head">
        <div>
          <h1 class="page-title">Notifications</h1>
          <div class="page-sub">Protocol deviation alerts, batch hold notifications, cold chain breach warnings, and submission deadline reminders</div>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <div class="info-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div>Showing notifications for your profile only. Use the status control to move an alert through the <strong>Unread &rarr; Read &rarr; Dismissed</strong> workflow.</div>
      </div>

      <!-- Notifications Table (Status is the last column, no Action column) -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>Alert Log <span class="count">&middot; {{ notifications().length }} total</span></h3>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <thead>
              <tr>
                <th style="width:40%;">Alert</th>
                <th style="width:18%;">Category</th>
                <th style="width:24%;">Logged Date</th>
                <th style="width:18%;">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let n of notifications()">
                <td class="name-cell">{{ n.message }}</td>
                <td><span class="tag">{{ n.category }}</span></td>
                <td class="mono">{{ n.createdDate | date:'medium' }}</td>
                <td>
                  <!-- Cyclical Status Action button: Unread -> Read -> Dismissed -->
                  <button type="button" class="status-toggle badge-status"
                    [class.badge-unread]="n.status === 'Unread'"
                    [class.badge-read]="n.status === 'Read'"
                    [class.badge-dismissed]="n.status === 'Dismissed'"
                    (click)="cycleNotificationStatus(n)">
                    {{ n.status }}
                  </button>
                </td>
              </tr>
              <tr *ngIf="notifications().length === 0">
                <td colspan="4" class="empty-state">No notifications registered for your profile.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* Status toggle button styled as a clickable badge (Unread / Read / Dismissed) */
    .status-toggle {
      cursor: pointer;
      font-family: inherit;
      border: 1px solid transparent;
      transition: filter .15s ease, background .15s ease;
    }
    .status-toggle:hover { filter: brightness(0.96); }
    .status-toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    /* Notification-specific badge colors (replicated from the design reference) */
    .badge-unread { background: var(--warning-light); color: var(--warning); }
    .badge-read { background: var(--blue-light); color: var(--blue); }
    .badge-dismissed { background: #eef0ef; color: #3c463f; }

    /* Inline alert feedback (component-specific) */
    .alert {
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      font-size: 13.5px;
    }
    .alert-error {
      background: var(--danger-light);
      color: var(--danger);
      border: 1px solid #f5c2c0;
    }
    .alert-success {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }
    .empty-state {
      text-align: center;
      color: var(--text-dim);
      font-style: italic;
      padding: 28px !important;
    }
  `]
})
export class NotificationsComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  notifications = signal<any[]>([]);

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
    const userIdVal = localStorage.getItem('pt_userId');
    if (userIdVal) {
      this.apiService.getNotifications(userIdVal).subscribe({
        next: (data) => {
          this.notifications.set(data || []);
        },
        error: (err) => this.showError(err.error?.message || 'Error loading user notifications.')
      });
    }
  }

  cycleNotificationStatus(n: any) {
    let nextStatus = 'Read';
    if (n.status === 'Read') {
      nextStatus = 'Dismissed';
    } else if (n.status === 'Dismissed') {
      nextStatus = 'Unread';
    }

    this.apiService.updateNotificationStatus(n.notificationId, nextStatus).subscribe({
      next: () => {
        n.status = nextStatus;
        this.showSuccess(`Notification updated to: ${nextStatus}`);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to update notification status.')
    });
  }

  showSuccess(msg: string) {
    this.successMsg.set(msg);
    this.errorMsg.set(null);
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  showError(msg: string) {
    this.errorMsg.set(msg);
    this.successMsg.set(null);
    setTimeout(() => this.errorMsg.set(null), 4000);
  }
}
