import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notifications-container">
      <div class="panel-header">
        <div>
          <h2>User Notifications Center</h2>
          <p>Real-time security triggers, workflow handoffs, and audit alerts.</p>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- Notifications Table (Status moved to the last column, no Action column) -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Message</th>
              <th>Logged Date</th>
              <th style="width: 140px;">Status / Toggle Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let n of notifications()">
              <td><span class="role-pill">{{ n.category }}</span></td>
              <td style="font-weight: 500;">{{ n.message }}</td>
              <td>{{ n.createdDate | date:'medium' }}</td>
              <td>
                <!-- Cyclical Status Action button -->
                <button class="cycle-status-btn"
                  [class.status-unread]="n.status === 'Unread'"
                  [class.status-read]="n.status === 'Read'"
                  [class.status-dismissed]="n.status === 'Dismissed'"
                  (click)="cycleNotificationStatus(n)">
                  <!-- Status text is the button label representing current state -->
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
  `,
  styles: [`
    .notifications-container {
      background: #ffffff;
      border: 1px solid #ece4dc;
      border-radius: 14px;
      padding: 32px;
    }
    .panel-header {
      margin-bottom: 24px;
      text-align: left;
    }
    .panel-header h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #211611;
      margin: 0 0 6px;
    }
    .panel-header p {
      color: #7a6a5e;
      font-size: 14px;
      margin: 0;
    }
    .table-container {
      overflow-x: auto;
      border: 1px solid #ece4dc;
      border-radius: 10px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 14px;
    }
    .data-table th {
      background: #f7f5f2;
      color: #211611;
      font-weight: 700;
      padding: 14px 16px;
      border-bottom: 1px solid #ece4dc;
    }
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #ece4dc;
      color: #211611;
      vertical-align: middle;
    }
    .role-pill {
      background: #fbe9de;
      color: #CE5200;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
    }
    .cycle-status-btn {
      width: 100%;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid transparent;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      transition: background 0.15s ease, border-color 0.15s ease;
      text-align: center;
    }
    .status-unread {
      background: #fff8e1;
      color: #f57f17;
      border-color: #ffe082;
    }
    .status-unread:hover {
      background: #f57f17;
      color: #ffffff;
    }
    .status-read {
      background: #e8f5e9;
      color: #2e7d32;
      border-color: #c8e6c9;
    }
    .status-read:hover {
      background: #2e7d32;
      color: #ffffff;
    }
    .status-dismissed {
      background: #f7f5f2;
      color: #7a6a5e;
      border-color: #ece4dc;
    }
    .status-dismissed:hover {
      background: #7a6a5e;
      color: #ffffff;
    }
    .alert {
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 13.5px;
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
    .empty-state {
      text-align: center;
      color: #7a6a5e;
      font-style: italic;
      padding: 24px !important;
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
