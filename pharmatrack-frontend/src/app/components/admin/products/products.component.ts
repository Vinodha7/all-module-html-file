import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ApiResponse } from '../../../services/auth.service';

interface Product {
  productId?: number;
  productName: string;
  storageCondition: string;
  minThreshold: number | null;
  maxThreshold: number | null;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <div class="page-head">
        <div>
          <h1 class="page-title">Products</h1>
          <div class="page-sub">Manage product profiles and storage thresholds</div>
        </div>
        <div class="actions-row">
          <div class="tooltip-wrap">
            <button type="button" class="btn btn-primary btn-create compact-create" (click)="openCreate()" aria-label="Create Product">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Product
            </button>
            <span class="tooltip">Create Product</span>
          </div>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>Product Profiles</h3>
          <span class="count">{{ filtered().length }} total</span>
        </div>

        <!-- Loading -->
        <div class="empty-state" *ngIf="loading()">
          <div class="spinner spinner-lg"></div>
          <div>Loading products...</div>
        </div>

        <!-- Empty -->
        <div class="empty-state" *ngIf="!loading() && filtered().length === 0">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
          <div>No products found.</div>
          <div class="empty-sub">Create a product profile to get started.</div>
        </div>

        <div class="table-scroll" *ngIf="!loading() && filtered().length > 0">
          <table class="table-fixed">
            <colgroup>
              <col style="width:20%">
              <col style="width:20%">
              <col style="width:15%">
              <col style="width:15%">
              <col style="width:15%">
              <col style="width:15%">
            </colgroup>
            <thead>
              <tr>
                <th>
                  <button type="button" class="th-sort" (click)="toggleSort('productName')">
                    Product Name
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                  </button>
                </th>
                <th>Storage Condition</th>
                <th>
                  <button type="button" class="th-sort" (click)="toggleSort('minThreshold')">
                    Min Threshold
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                  </button>
                </th>
                <th>
                  <button type="button" class="th-sort" (click)="toggleSort('maxThreshold')">
                    Max Threshold
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>
                  </button>
                </th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of paginated(); let i = index">
                <td class="name-cell">{{ p.productName }}</td>
                <td>{{ p.storageCondition }}</td>
                <td>{{ p.minThreshold }}</td>
                <td>{{ p.maxThreshold }}</td>
                <td><span class="badge-status badge-active">Active</span></td>
                <td>
                  <div class="dropdown">
                    <button type="button" class="icon-menu-btn" title="Actions" (click)="toggleMenu(i); $event.stopPropagation()">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === i">
                      <button type="button" class="dropdown-item" (click)="openView(p)">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="!loading() && filtered().length > 0">
          <div>Page {{ page() }} of {{ totalPages() }} · {{ filtered().length }} products</div>
          <div class="pager">
            <button type="button" [disabled]="page() === 1" (click)="prevPage()" title="Previous page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span style="padding:0 4px;">{{ page() }} / {{ totalPages() }}</span>
            <button type="button" [disabled]="page() === totalPages()" (click)="nextPage()" title="Next page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- CREATE MODAL -->
      <div class="modal-overlay" *ngIf="showCreate()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="requestCloseCreate()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Create Product</h2>

          <div class="form-grid">
            <div class="field">
              <label>Product ID</label>
              <input type="text" value="Auto-generated" disabled />
            </div>
            <div class="field">
              <label>Product Name <span class="req">*</span></label>
              <input type="text" placeholder="e.g. Insulin Glargine" [(ngModel)]="form.productName" />
              <div class="field-error" *ngIf="submitted() && !(form.productName || '').trim()">Product name is required.</div>
            </div>
            <div class="field">
              <label>Storage Condition <span class="req">*</span></label>
              <select [(ngModel)]="form.storageCondition">
                <option value="">Select storage condition...</option>
                <option *ngFor="let c of storageOptions" [value]="c">{{ c }}</option>
              </select>
              <div class="field-error" *ngIf="submitted() && !form.storageCondition">Storage condition is required.</div>
            </div>
            <div class="field">
              <label>Minimum Threshold <span class="req">*</span></label>
              <input type="number" placeholder="e.g. 2" [(ngModel)]="form.minThreshold" />
              <div class="field-error" *ngIf="submitted() && (form.minThreshold === null || form.minThreshold === undefined)">Minimum threshold is required.</div>
              <div class="field-error" *ngIf="submitted() && thresholdInvalid()">Minimum threshold cannot exceed maximum threshold.</div>
            </div>
            <div class="field">
              <label>Maximum Threshold <span class="req">*</span></label>
              <input type="number" placeholder="e.g. 8" [(ngModel)]="form.maxThreshold" />
              <div class="field-error" *ngIf="submitted() && (form.maxThreshold === null || form.maxThreshold === undefined)">Maximum threshold is required.</div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="submitCreate()" [disabled]="saving()">
              <span class="spinner" *ngIf="saving()"></span>
              {{ saving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </div>

      <!-- VIEW MODAL -->
      <div class="modal-overlay" *ngIf="viewProduct()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="viewProduct.set(null)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Product Details</h2>

          <div class="detail-grid">
            <div class="detail-field">
              <label>Product Name</label>
              <div class="value">{{ viewProduct()?.productName }}</div>
            </div>
            <div class="detail-field">
              <label>Storage Condition</label>
              <div class="value">{{ viewProduct()?.storageCondition }}</div>
            </div>
            <div class="detail-field">
              <label>Min Threshold</label>
              <div class="value">{{ viewProduct()?.minThreshold }}</div>
            </div>
            <div class="detail-field">
              <label>Max Threshold</label>
              <div class="value">{{ viewProduct()?.maxThreshold }}</div>
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
    /* Fit the products table to the screen — no horizontal scroll. */
    table.table-fixed { min-width: 0; }
    .table-scroll { overflow-x: hidden; }
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

    .th-sort {
      background: none; border: none; padding: 0; cursor: pointer;
      font-family: inherit; font-size: 11.5px; font-weight: 700;
      letter-spacing: .06em; color: var(--text-dim); text-transform: uppercase;
    }
    .th-sort svg { opacity: .7; }

    .empty-state {
      text-align: center; color: var(--text-dim);
      padding: 54px 24px; display: flex; flex-direction: column;
      align-items: center; gap: 10px; font-size: 14.5px;
    }
    .empty-state svg { color: #c7cdc9; }
    .empty-state .empty-sub { font-size: 13px; color: #a7b0aa; }

    .field-error {
      color: var(--danger); font-size: 12.5px; font-weight: 500; margin-top: 6px;
    }

    .spinner {
      display: inline-block; width: 15px; height: 15px;
      border: 2px solid rgba(255,255,255,.45); border-top-color: #fff;
      border-radius: 50%; animation: pt-spin .7s linear infinite;
      vertical-align: middle;
    }
    .spinner-lg {
      width: 26px; height: 26px; border-width: 3px;
      border: 3px solid var(--border); border-top-color: var(--accent);
    }
    @keyframes pt-spin { to { transform: rotate(360deg); } }

    .pager button:disabled { opacity: .45; cursor: not-allowed; }

    .alert {
      padding: 10px 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13.5px;
    }
    .alert-error { background: #fbeceb; color: #b3261e; border: 1px solid #f5c2c0; }
    .alert-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
  `]
})
export class ProductsComponent implements OnInit {
  private apiService = inject(ApiService);

  loading = signal<boolean>(false);
  saving = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  products = signal<Product[]>([]);

  // Filters / search
  search = signal<string>('');
  statusFilter = signal<string>('All');

  // Sorting
  sortBy = signal<'productName' | 'minThreshold' | 'maxThreshold' | null>('productName');
  sortDir = signal<'asc' | 'desc'>('asc');

  // Pagination
  page = signal<number>(1);
  pageSize = 10;

  // Row menu / modals
  openMenu = signal<number | null>(null);
  showCreate = signal<boolean>(false);
  viewProduct = signal<Product | null>(null);
  submitted = signal<boolean>(false);

  storageOptions = [
    'Refrigerated (2-8°C)',
    'Frozen (-20°C)',
    'Controlled Room Temp (15-25°C)',
    'Room Temperature',
    'Ultra-Low (-70°C)'
  ];

  form: Product = this.emptyForm();

  filtered = computed<Product[]>(() => {
    const term = this.search().trim().toLowerCase();
    let result = this.products().filter(p => {
      if (!term) return true;
      return (p.productName || '').toLowerCase().includes(term)
        || (p.storageCondition || '').toLowerCase().includes(term);
    });
    // statusFilter: backend has no status, everything is Active — 'All' and 'Active' both match.
    const key = this.sortBy();
    if (key) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (key === 'productName') {
          return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
        }
        return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
      });
    }
    return result;
  });

  totalPages = computed<number>(() => Math.ceil(this.filtered().length / this.pageSize) || 1);

  paginated = computed<Product[]>(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filtered().slice(start, start + this.pageSize);
  });

  ngOnInit() {
    this.fetchProducts();
  }

  fetchProducts() {
    this.loading.set(true);
    this.apiService.getProducts().subscribe({
      next: (res: ApiResponse<any[]>) => {
        this.products.set(res?.data || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.showError(err?.error?.message || 'Error fetching products.');
      }
    });
  }

  onSearch(value: string) {
    this.search.set(value);
    this.page.set(1);
  }

  toggleSort(key: 'productName' | 'minThreshold' | 'maxThreshold') {
    if (this.sortBy() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(key);
      this.sortDir.set('asc');
    }
    this.page.set(1);
  }

  toggleMenu(i: number) {
    this.openMenu.set(this.openMenu() === i ? null : i);
  }

  prevPage() {
    if (this.page() > 1) this.page.set(this.page() - 1);
  }

  nextPage() {
    if (this.page() < this.totalPages()) this.page.set(this.page() + 1);
  }

  // ── CREATE ──
  openCreate() {
    this.form = this.emptyForm();
    this.submitted.set(false);
    this.showCreate.set(true);
    this.openMenu.set(null);
  }

  closeCreate() {
    this.showCreate.set(false);
    this.submitted.set(false);
  }

  requestCloseCreate() {
    if (window.confirm('Discard unsaved changes?')) {
      this.closeCreate();
    }
  }

  thresholdInvalid(): boolean {
    const min = this.form.minThreshold;
    const max = this.form.maxThreshold;
    if (min === null || min === undefined || max === null || max === undefined) return false;
    return Number(min) > Number(max);
  }

  private formValid(): boolean {
    if (!this.form.productName || !this.form.productName.trim()) return false;
    if (!this.form.storageCondition) return false;
    if (this.form.minThreshold === null || this.form.minThreshold === undefined) return false;
    if (this.form.maxThreshold === null || this.form.maxThreshold === undefined) return false;
    if (this.thresholdInvalid()) return false;
    return true;
  }

  submitCreate() {
    this.submitted.set(true);
    if (!this.formValid()) return;

    this.saving.set(true);
    const payload = {
      productName: this.form.productName.trim(),
      storageCondition: this.form.storageCondition,
      minThreshold: Number(this.form.minThreshold),
      maxThreshold: Number(this.form.maxThreshold)
    };

    this.apiService.createProduct(payload).subscribe({
      next: (res: ApiResponse<any>) => {
        this.saving.set(false);
        if (res && res.success === false) {
          this.showError(res.message || 'Failed to create product.');
          return;
        }
        this.showSuccess('Product created successfully.');
        this.closeCreate();
        this.fetchProducts();
      },
      error: (err) => {
        this.saving.set(false);
        this.showError(err?.error?.message || 'Failed to create product.');
      }
    });
  }

  // ── VIEW ──
  openView(p: Product) {
    this.viewProduct.set(p);
    this.openMenu.set(null);
  }

  // ── EXPORT (client-side CSV of the current filtered rows) ──
  exportCsv() {
    const rows = this.filtered();
    const headers = ['Product Name', 'Storage Condition', 'Min Threshold', 'Max Threshold', 'Status'];
    const escape = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const lines = [headers.map(escape).join(',')];
    rows.forEach(p => {
      lines.push([p.productName, p.storageCondition, p.minThreshold, p.maxThreshold, 'Active'].map(escape).join(','));
    });
    const csv = lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PharmaTrack_Products.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.showSuccess('Products exported to CSV successfully.');
  }

  private emptyForm(): Product {
    return { productName: '', storageCondition: '', minThreshold: null, maxThreshold: null };
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
