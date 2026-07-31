import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ApiResponse } from '../../../services/auth.service';

@Component({
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <!-- Title & Actions -->
      <div class="page-head">
        <div>
          <h1 class="page-title">Sites</h1>
          <div class="page-sub">Manage clinical and manufacturing site directory</div>
        </div>
        <div class="actions-row">
          <div class="tooltip-wrap">
            <button type="button" class="btn btn-primary btn-create compact-create" (click)="openCreateModal()" aria-label="Create Site">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Site
            </button>
            <span class="tooltip">Create Site</span>
          </div>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>


      <!-- Table -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>Site Directory <span class="count">· {{ filteredSites().length }} total</span></h3>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <colgroup>
              <col style="width:60%">
              <col style="width:40%">
            </colgroup>
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort('siteName')">
                  Site Name
                  <span class="sort-ind" [class.active]="sortBy() === 'siteName'">{{ sortBy() === 'siteName' ? (sortDir() === 'asc' ? '▲' : '▼') : '↕' }}</span>
                </th>
                <th class="sortable" (click)="toggleSort('country')">
                  Country
                  <span class="sort-ind" [class.active]="sortBy() === 'country'">{{ sortBy() === 'country' ? (sortDir() === 'asc' ? '▲' : '▼') : '↕' }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading()">
                <td colspan="2" class="empty-state">
                  <span class="spinner spinner-dark"></span> Loading sites...
                </td>
              </tr>
              <ng-container *ngIf="!loading()">
                <tr *ngFor="let site of paginatedSites()">
                  <td class="name-cell">{{ site.siteName }}</td>
                  <td>{{ site.country }}</td>
                </tr>
              </ng-container>
              <tr *ngIf="!loading() && filteredSites().length === 0">
                <td colspan="2" class="empty-state">No sites found matching criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="!loading() && filteredSites().length > 0">
          <div>Page {{ page() }} of {{ totalPages() }} · {{ filteredSites().length }} sites</div>
          <div class="pager">
            <button type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)" aria-label="Previous page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span style="padding:0 4px;">{{ page() }} / {{ totalPages() }}</span>
            <button type="button" [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" aria-label="Next page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- CREATE SITE MODAL -->
      <div class="modal-overlay" *ngIf="showCreateModal()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="requestCloseCreate()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Create Site</h2>
          <div class="page-sub" style="margin:-16px 0 24px 0;">Add a new site to the clinical and manufacturing directory</div>
          <form (ngSubmit)="handleCreateSite()">
            <div class="form-grid">
              <div class="field">
                <label>Site Name<span class="req">*</span></label>
                <input type="text" name="siteName" [(ngModel)]="createForm.siteName" (input)="submitted() && validate()" maxlength="150" placeholder="e.g. Boston Research Site">
                <div class="field-error" *ngIf="submitted() && !createForm.siteName.trim()">Site name is required.</div>
                <div class="field-error" *ngIf="submitted() && createForm.siteName.trim() && duplicateName()">A site with this name already exists.</div>
              </div>
              <div class="field">
                <label>Country<span class="req">*</span></label>
                <select name="country" [(ngModel)]="createForm.country">
                  <option value="" disabled>Select a country...</option>
                  <option *ngFor="let c of countries" [value]="c">{{ c }}</option>
                </select>
                <div class="field-error" *ngIf="submitted() && !createForm.country">Country is required.</div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">
                <span class="spinner" *ngIf="saving()"></span>
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- VIEW SITE MODAL -->
      <div class="modal-overlay" *ngIf="selectedSite()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="selectedSite.set(null)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Site Details</h2>
          <div class="detail-grid">
            <div class="detail-field">
              <label>Site Name</label>
              <div class="value">{{ selectedSite().siteName }}</div>
            </div>
            <div class="detail-field">
              <label>Country</label>
              <div class="value">{{ selectedSite().country }}</div>
            </div>
            <div class="detail-field">
              <label>Status</label>
              <span class="badge-status badge-active">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-select { min-width: 200px; }
    .filter-select select {
      border: none; background: transparent; font-family: inherit;
      font-size: 14px; color: var(--text); flex: 1; cursor: pointer;
      outline: none; padding: 0;
    }
    .filter-select svg { color: var(--text-dim); flex-shrink: 0; }
    .compact-create { gap: 3px; }
    /* Tooltip above the create button */
    .tooltip-wrap { position: relative; display: inline-flex; }
    .tooltip {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: #1e1008; color: #fff; font-size: 12px; font-weight: 600;
      padding: 5px 10px; border-radius: 6px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity .15s ease;
    }
    .tooltip::after {
      content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #1e1008;
    }
    .tooltip-wrap:hover .tooltip { opacity: 1; }

    th.sortable { cursor: pointer; user-select: none; white-space: nowrap; }
    .sort-ind { font-size: 11px; color: var(--text-dim); margin-left: 5px; }
    .sort-ind.active { color: var(--accent-dark); }

    .empty-state {
      text-align: center;
      color: var(--text-dim);
      font-style: italic;
      padding: 28px 24px !important;
    }
    .pager button:disabled { opacity: 0.45; cursor: not-allowed; }

    .form-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;
    }

    .field-error {
      color: var(--danger);
      font-size: 12.5px;
      font-weight: 500;
      margin-top: 6px;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.45);
      border-top-color: #fff;
      border-radius: 50%;
      animation: sites-spin 0.7s linear infinite;
      vertical-align: -2px;
      margin-right: 6px;
    }
    .spinner-dark {
      border: 2px solid rgba(0, 0, 0, 0.15);
      border-top-color: var(--accent-dark);
    }
    @keyframes sites-spin { to { transform: rotate(360deg); } }

    .alert {
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      font-size: 13.5px;
      font-weight: 500;
    }
    .alert-error { background: var(--danger-light); color: var(--danger); border: 1px solid #f0c9c7; }
    .alert-success { background: var(--accent-light); color: var(--accent-dark); border: 1px solid #f0c9a8; }
  `]
})
export class SitesComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  loading = signal<boolean>(false);
  saving = signal<boolean>(false);

  sites = signal<any[]>([]);
  filteredSites = signal<any[]>([]);

  // Filters
  searchTerm = '';
  statusFilter = 'All';

  // Sorting
  sortBy = signal<'siteName' | 'country'>('siteName');
  sortDir = signal<'asc' | 'desc'>('asc');

  // Pagination
  page = signal<number>(1);
  pageSize = 10;
  totalPages = computed(() => Math.ceil(this.filteredSites().length / this.pageSize) || 1);

  // Row action dropdown
  openedRow = signal<any>(null);

  // Modals
  showCreateModal = signal<boolean>(false);
  selectedSite = signal<any>(null);

  // Create form
  submitted = signal<boolean>(false);
  createForm = { siteName: '', country: '' };

  countries = [
    'India', 'United States', 'United Kingdom', 'Germany', 'France',
    'Switzerland', 'Japan', 'China', 'Canada', 'Australia',
    'Brazil', 'Singapore', 'Netherlands', 'Ireland', 'Belgium'
  ];

  ngOnInit() {
    this.fetchSites();
  }

  fetchSites() {
    this.loading.set(true);
    this.apiService.getSites().subscribe({
      next: (res: ApiResponse<any[]>) => {
        if (res.success) {
          this.sites.set(res.data || []);
          this.applyFilters();
        } else {
          this.showError(res.message || 'Unable to load sites.');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.showError(err.error?.message || 'Error fetching sites.');
        this.loading.set(false);
      }
    });
  }

  applyFilters() {
    let result = [...this.sites()];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(s =>
        (s.siteName || '').toLowerCase().includes(term) ||
        (s.country || '').toLowerCase().includes(term)
      );
    }

    // Backend has no status; every site is treated as "Active".
    // Both "All" and "Active" therefore include all rows.

    const key = this.sortBy();
    const dir = this.sortDir() === 'asc' ? 1 : -1;
    result.sort((a, b) => (a[key] || '').localeCompare(b[key] || '') * dir);

    this.filteredSites.set(result);
    this.page.set(1);
  }

  toggleSort(col: 'siteName' | 'country') {
    if (this.sortBy() === col) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(col);
      this.sortDir.set('asc');
    }
    this.applyFilters();
  }

  paginatedSites() {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredSites().slice(start, start + this.pageSize);
  }

  toggleActionDropdown(site: any) {
    this.openedRow.set(this.openedRow() === site ? null : site);
  }

  viewSite(site: any) {
    this.selectedSite.set(site);
    this.openedRow.set(null);
  }

  openCreateModal() {
    this.createForm = { siteName: '', country: '' };
    this.submitted.set(false);
    this.showCreateModal.set(true);
    this.clearMessages();
  }

  requestCloseCreate() {
    if (window.confirm('Discard unsaved changes?')) {
      this.showCreateModal.set(false);
      this.submitted.set(false);
    }
  }

  duplicateName(): boolean {
    const name = this.createForm.siteName.trim().toLowerCase();
    if (!name) return false;
    return this.sites().some(s => (s.siteName || '').trim().toLowerCase() === name);
  }

  validate(): boolean {
    return !!this.createForm.siteName.trim() && !!this.createForm.country && !this.duplicateName();
  }

  handleCreateSite() {
    this.submitted.set(true);
    if (!this.validate()) {
      return;
    }

    const payload = {
      siteName: this.createForm.siteName.trim(),
      country: this.createForm.country
    };

    this.saving.set(true);
    this.apiService.createSite(payload).subscribe({
      next: (res: ApiResponse<any>) => {
        this.saving.set(false);
        this.showCreateModal.set(false);
        this.showSuccess('Site created successfully.');
        this.fetchSites();
      },
      error: (err) => {
        this.saving.set(false);
        this.showError(err.error?.message || 'Failed to create site.');
      }
    });
  }

  exportCsv() {
    const rows = this.filteredSites();
    const header = ['Site Name', 'Country', 'Status'];
    const escape = (val: any) => {
      const s = String(val ?? '');
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [
      header.join(','),
      ...rows.map(s => [escape(s.siteName), escape(s.country), 'Active'].join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PharmaTrack_Sites.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.showSuccess('Sites exported to CSV successfully.');
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

  clearMessages() {
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }
}
