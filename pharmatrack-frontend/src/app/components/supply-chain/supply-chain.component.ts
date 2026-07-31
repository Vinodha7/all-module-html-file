import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-supply-chain',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-head">
      <div>
        <h1 class="page-title">Supply &amp; Cold Chain</h1>
        <p class="page-sub">Shipments, site inventory balances and real-time cold-chain readings.</p>
      </div>
      <div class="actions-row">
        <button class="btn btn-primary btn-create" *ngIf="activeTab() === 'shipments'" (click)="openCreateShipmentModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Shipment
        </button>
        <button class="btn btn-primary btn-create" *ngIf="activeTab() === 'inventory'" (click)="openCreateInventoryModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Inventory
        </button>
        <button class="btn btn-primary btn-create" *ngIf="activeTab() === 'telemetry'" (click)="openRecordTelemetryModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Record Reading
        </button>
      </div>
    </div>

    <!-- Side-by-side tabs on the same page -->
    <div class="tabs">
      <button class="tab" [class.active]="activeTab() === 'shipments'" (click)="activeTab.set('shipments')">Shipments</button>
      <button class="tab" [class.active]="activeTab() === 'inventory'" (click)="activeTab.set('inventory')">Inventory</button>
      <button class="tab" [class.active]="activeTab() === 'telemetry'" (click)="activeTab.set('telemetry')">Cold Chain</button>
    </div>

    <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
    <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

    <!-- 1. SHIPMENTS TAB -->
    <div *ngIf="activeTab() === 'shipments'">
      <div class="table-card">
        <div class="table-card-head">
          <h3>Shipments</h3>
          <span class="count">{{ shipments().length }} records</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Batch</th>
                <th>Route</th>
                <th>Shipment Date</th>
                <th>Quantity</th>
                <th>Carrier</th>
                <th>Status</th>
                <th style="width: 170px;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of paginatedShipments()">
                <td class="name-cell ref-accent">SHIP-{{ s.shipmentId }}</td>
                <td>{{ s.batch?.batchNumber }}</td>
                <td class="route"><b>{{ s.fromSite?.siteName }}</b> &rarr; {{ s.toSite?.siteName }}</td>
                <td>{{ s.shipmentDate }}</td>
                <td>{{ s.quantityShipped }} {{ s.unit }}</td>
                <td>{{ s.carrierName }}</td>
                <td>
                  <span class="status-indicator"
                    [class.status-draft]="s.status === 'Dispatched'"
                    [class.status-active]="s.status === 'InTransit'"
                    [class.status-completed]="s.status === 'Delivered'"
                    [class.status-terminated]="s.status === 'Lost' || s.status === 'Rejected'">
                    {{ s.status }}
                  </span>
                </td>
                <td>
                  <!-- Supply chain transitions are NOT signature-gated (transition directly) -->
                  <div class="actions-menu-wrap" *ngIf="s.status !== 'Delivered' && s.status !== 'Lost' && s.status !== 'Rejected'">
                    <select (change)="updateShipmentStatus(s.shipmentId, $event)" class="inline-select">
                      <option value="">Update Status</option>
                      <option value="InTransit" *ngIf="s.status === 'Dispatched'">In Transit</option>
                      <option value="Delivered" *ngIf="s.status === 'InTransit'">Delivered</option>
                      <option value="Lost">Lost</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <span class="locked-note" *ngIf="s.status === 'Delivered' || s.status === 'Lost' || s.status === 'Rejected'">Closed</span>
                </td>
              </tr>
              <tr *ngIf="shipments().length === 0">
                <td colspan="8" class="empty-state">No shipments registered.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="shipments().length > 0">
          <span>Page {{ shipPage() }} of {{ shipTotalPages() }}</span>
          <div class="pager">
            <button [disabled]="shipPage() === 1" (click)="shipPage.set(shipPage() - 1)">Previous</button>
            <button [disabled]="shipPage() === shipTotalPages()" (click)="shipPage.set(shipPage() + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. INVENTORY TAB -->
    <div *ngIf="activeTab() === 'inventory'">
      <div class="table-card">
        <div class="table-card-head">
          <h3>Site Inventory</h3>
          <span class="count">{{ inventory().length }} records</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Batch</th>
                <th>Qty Received</th>
                <th>Qty Dispensed</th>
                <th>Qty On Hand</th>
                <th>Storage</th>
                <th style="width: 140px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of paginatedInventory()">
                <td class="name-cell">{{ getSiteName(inv.siteId) }}</td>
                <td>{{ getBatchNumber(inv.batchId) }}</td>
                <td>{{ inv.quantityReceived }}</td>
                <td>{{ inv.quantityDispensed }}</td>
                <td class="onhand">{{ inv.quantityReceived - inv.quantityDispensed }}</td>
                <td><span class="storage-tag">{{ inv.storageCondition }}</span></td>
                <td>
                  <div class="actions-menu-wrap">
                    <button class="btn btn-outline btn-sm" (click)="openUpdateInventoryQtyModal(inv)">Update Qty</button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="inventory().length === 0">
                <td colspan="7" class="empty-state">No site inventory logs compiled.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="inventory().length > 0">
          <span>Page {{ invPage() }} of {{ invTotalPages() }}</span>
          <div class="pager">
            <button [disabled]="invPage() === 1" (click)="invPage.set(invPage() - 1)">Previous</button>
            <button [disabled]="invPage() === invTotalPages()" (click)="invPage.set(invPage() + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. TELEMETRY TAB -->
    <div *ngIf="activeTab() === 'telemetry'">
      <div class="table-card cold-chain">
        <div class="table-card-head">
          <h3>Cold-Chain Readings</h3>
          <span class="count">{{ telemetry().length }} records</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reading ID</th>
                <th>Shipment ID</th>
                <th>Recorded At</th>
                <th>Temperature</th>
                <th>Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of paginatedTelemetry()">
                <td class="name-cell">SENS-{{ log.logId }}</td>
                <td class="ref-accent">SHIP-{{ log.shipmentId }}</td>
                <td>{{ log.recordedAt | date:'medium' }}</td>
                <td class="temp-value" [class.danger-text]="log.temperature < log.minThreshold || log.temperature > log.maxThreshold">
                  {{ log.temperature }} °C
                </td>
                <td>{{ log.minThreshold }} °C to {{ log.maxThreshold }} °C</td>
                <td>
                  <span class="status-indicator"
                    [class.status-active]="log.temperature >= log.minThreshold && log.temperature <= log.maxThreshold"
                    [class.status-inactive]="log.temperature < log.minThreshold || log.temperature > log.maxThreshold">
                    {{ (log.temperature >= log.minThreshold && log.temperature <= log.maxThreshold) ? 'NORMAL' : 'EXCURSION' }}
                  </span>
                </td>
              </tr>
              <tr *ngIf="telemetry().length === 0">
                <td colspan="6" class="empty-state">No sensor logs compiled yet.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="telemetry().length > 0">
          <span>Page {{ telPage() }} of {{ telTotalPages() }}</span>
          <div class="pager">
            <button [disabled]="telPage() === 1" (click)="telPage.set(telPage() - 1)">Previous</button>
            <button [disabled]="telPage() === telTotalPages()" (click)="telPage.set(telPage() + 1)">Next</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── MODALS ── -->

    <!-- A. CREATE SHIPMENT MODAL -->
    <div class="modal-overlay" *ngIf="showCreateShipmentModal()">
      <div class="modal">
        <button class="modal-close-x" (click)="confirmDiscard() && showCreateShipmentModal.set(false)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Create Shipment</h2>
        <form (ngSubmit)="handleCreateShipment()">
          <div class="field field-full">
            <label>Select Batch Run<span class="req">*</span></label>
            <select name="batchId" [(ngModel)]="createShipmentForm.batchId" required>
              <option *ngFor="let b of batches()" [value]="b.batchId">{{ b.batchNumber }} (Prod: {{ getProductName(b.productId) }})</option>
            </select>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Origin Site<span class="req">*</span></label>
              <select name="fromSiteId" [(ngModel)]="createShipmentForm.fromSiteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Destination Site<span class="req">*</span></label>
              <select name="toSiteId" [(ngModel)]="createShipmentForm.toSiteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Quantity Shipped<span class="req">*</span></label>
              <input type="number" name="qty" [(ngModel)]="createShipmentForm.quantityShipped" required>
            </div>
            <div class="field">
              <label>Unit of Measure<span class="req">*</span></label>
              <input type="text" name="unit" [(ngModel)]="createShipmentForm.unit" placeholder="e.g. Vials" required>
            </div>
            <div class="field">
              <label>Logistics Carrier Name<span class="req">*</span></label>
              <input type="text" name="carrier" [(ngModel)]="createShipmentForm.carrierName" placeholder="e.g. DHL ColdExpress" required>
            </div>
            <div class="field">
              <label>Shipment Date<span class="req">*</span></label>
              <input type="date" name="shipD" [(ngModel)]="createShipmentForm.shipmentDate" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Dispatch Shipment</button>
          </div>
        </form>
      </div>
    </div>

    <!-- B. CREATE INVENTORY MODAL -->
    <div class="modal-overlay" *ngIf="showCreateInventoryModal()">
      <div class="modal">
        <button class="modal-close-x" (click)="confirmDiscard() && showCreateInventoryModal.set(false)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Add Inventory</h2>
        <form (ngSubmit)="handleCreateInventory()">
          <div class="form-grid">
            <div class="field">
              <label>Investigation Site<span class="req">*</span></label>
              <select name="invSite" [(ngModel)]="createInventoryForm.siteId" required>
                <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Batch Reference<span class="req">*</span></label>
              <select name="invBatch" [(ngModel)]="createInventoryForm.batchId" required>
                <option *ngFor="let b of batches()" [value]="b.batchId">{{ b.batchNumber }}</option>
              </select>
            </div>
            <div class="field">
              <label>Quantity Received<span class="req">*</span></label>
              <input type="number" name="rcv" [(ngModel)]="createInventoryForm.quantityReceived" required>
            </div>
            <div class="field">
              <label>Quantity Dispensed<span class="req">*</span></label>
              <input type="number" name="dsp" [(ngModel)]="createInventoryForm.quantityDispensed" required>
            </div>
            <div class="field field-full">
              <label>Storage Condition Parameters<span class="req">*</span></label>
              <input type="text" name="store" [(ngModel)]="createInventoryForm.storageCondition" placeholder="e.g. Keep at 2-8°C" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Log Entry</button>
          </div>
        </form>
      </div>
    </div>

    <!-- C. UPDATE INVENTORY MODAL -->
    <div class="modal-overlay" *ngIf="selectedInventoryForQty()">
      <div class="modal">
        <button class="modal-close-x" (click)="confirmDiscard() && selectedInventoryForQty.set(null)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Update Inventory Quantities</h2>
        <form (ngSubmit)="handleUpdateInventoryQty()">
          <div class="info-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <div>
              <strong>Site:</strong> {{ getSiteName(selectedInventoryForQty().siteId) }} &nbsp;|&nbsp;
              <strong>Batch:</strong> {{ getBatchNumber(selectedInventoryForQty().batchId) }}
            </div>
          </div>
          <div class="form-grid">
            <div class="field">
              <label>Action Type</label>
              <select name="qtyAction" [(ngModel)]="updateInventoryQtyType">
                <option value="received">Record Received Quantity</option>
                <option value="dispensed">Record Dispensed Quantity</option>
              </select>
            </div>
            <div class="field">
              <label>Add Quantity Value<span class="req">*</span></label>
              <input type="number" name="qtyVal" [(ngModel)]="updateInventoryQtyValue" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Update Qty</button>
          </div>
        </form>
      </div>
    </div>

    <!-- D. RECORD TELEMETRY MODAL -->
    <div class="modal-overlay" *ngIf="showRecordTelemetryModal()">
      <div class="modal">
        <button class="modal-close-x" (click)="confirmDiscard() && showRecordTelemetryModal.set(false)" aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>Record Temperature Reading</h2>
        <form (ngSubmit)="handleRecordTelemetry()">
          <div class="field field-full">
            <label>Associated Shipment<span class="req">*</span></label>
            <select name="telShip" [(ngModel)]="recordTelemetryForm.shipmentId" required>
              <option *ngFor="let s of shipments()" [value]="s.shipmentId">SHIP-{{ s.shipmentId }} (Carrier: {{ s.carrierName }})</option>
            </select>
          </div>
          <div class="form-grid">
            <div class="field field-full">
              <label>Recorded Temperature (°C)<span class="req">*</span></label>
              <input type="number" step="0.1" name="tempVal" [(ngModel)]="recordTelemetryForm.temperature" required>
            </div>
            <div class="field">
              <label>Min Range Limit (°C)<span class="req">*</span></label>
              <input type="number" step="0.1" name="telMin" [(ngModel)]="recordTelemetryForm.minThreshold" required>
            </div>
            <div class="field">
              <label>Max Range Limit (°C)<span class="req">*</span></label>
              <input type="number" step="0.1" name="telMax" [(ngModel)]="recordTelemetryForm.maxThreshold" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Record Log</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* TABS (module-specific, replicated from design references) */
    .tabs {
      display: flex;
      gap: 26px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 22px;
    }
    .tab {
      padding: 10px 2px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-dim);
      cursor: pointer;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-family: inherit;
      transition: color .15s ease, border-color .15s ease;
    }
    .tab:hover { color: var(--text); }
    .tab.active {
      color: var(--accent-dark);
      border-bottom-color: var(--accent);
    }

    /* Business identifier emphasis */
    .ref-accent { color: var(--accent-dark); font-weight: 700; }
    .route { color: var(--text-dim); }
    .route b { color: var(--text); font-weight: 600; }
    .onhand { font-weight: 700; color: var(--accent-dark); }
    .locked-note { color: var(--text-dim); font-size: 13px; font-style: italic; }

    /* STATUS BADGES (shipment states + cold-chain reading states) */
    .status-indicator {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
    }
    .status-draft      { background: #e9edf5; color: #3b5384; }   /* Dispatched */
    .status-active     { background: #fdf0da; color: #b3720a; }   /* InTransit */
    .status-completed  { background: #dff3e6; color: #1a7a4f; }   /* Delivered */
    .status-terminated { background: #fbe0df; color: #c0392b; }   /* Lost / Rejected */
    .status-inactive   { background: #fbe0df; color: #c0392b; }   /* EXCURSION */
    /* Cold-chain NORMAL reading reuses status-active binding, but reads green here */
    .cold-chain .status-active { background: #dff3e6; color: #1a7a4f; }

    /* Temperature / reading indicator */
    .temp-value { font-weight: 700; font-variant-numeric: tabular-nums; }
    .danger-text { color: #c0392b; }

    /* Storage condition tag */
    .storage-tag {
      background: var(--accent-light);
      color: var(--accent-dark);
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 12.5px;
      font-weight: 600;
    }

    /* Inline status-transition select in the shipments action column */
    .inline-select {
      padding: 7px 10px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      outline: none;
      font-size: 13px;
      background: #fff;
      color: var(--text);
      font-family: inherit;
      cursor: pointer;
    }
    .inline-select:focus { border-color: var(--accent); }

    /* Small button variant used in table rows */
    .btn-sm { padding: 7px 14px; font-size: 13px; }

    /* Pagination (Previous / Next preserved) */
    .table-footer .pager button {
      width: auto;
      padding: 0 14px;
      height: 30px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .table-footer .pager button:disabled { opacity: .5; cursor: not-allowed; }

    /* ALERTS */
    .alert {
      padding: 12px 16px;
      border-radius: var(--radius-md);
      margin-bottom: 20px;
      font-size: 13.5px;
      font-weight: 500;
    }
    .alert-error {
      background: var(--danger-light);
      color: var(--danger);
      border: 1px solid #f5c2c0;
    }
    .alert-success {
      background: #dff3e6;
      color: #1a7a4f;
      border: 1px solid #c8e6c9;
    }

    .empty-state {
      text-align: center;
      color: var(--text-dim);
      font-style: italic;
      padding: 28px !important;
    }

    /* MODAL sizing overrides (scoped to this component) */
    .modal {
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .field-full { grid-column: 1 / -1; }
    .field.field-full { margin-bottom: 20px; }
    .form-grid { margin-bottom: 8px; }
  `]
})
export class SupplyChainComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'shipments' | 'inventory' | 'telemetry'>('shipments');
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Data pools
  shipments = signal<any[]>([]);
  inventory = signal<any[]>([]);
  telemetry = signal<any[]>([]);
  
  batches = signal<any[]>([]);
  sites = signal<any[]>([]);
  products = signal<any[]>([]);

  // Pagination states
  shipPage = signal<number>(1);
  shipTotalPages = signal<number>(1);

  invPage = signal<number>(1);
  invTotalPages = signal<number>(1);

  telPage = signal<number>(1);
  telTotalPages = signal<number>(1);
  
  pageSize = 8;

  // Modals Visibility
  showCreateShipmentModal = signal<boolean>(false);
  showCreateInventoryModal = signal<boolean>(false);
  selectedInventoryForQty = signal<any | null>(null);
  showRecordTelemetryModal = signal<boolean>(false);

  // Form Models
  createShipmentForm = {
    batchId: null as any,
    fromSiteId: null as any,
    toSiteId: null as any,
    shipmentDate: '',
    quantityShipped: 100,
    unit: 'Vials',
    carrierName: ''
  };

  createInventoryForm = {
    siteId: null as any,
    batchId: null as any,
    quantityReceived: 500,
    quantityDispensed: 0,
    storageCondition: 'Keep at 2-8°C'
  };

  updateInventoryQtyType = 'received';
  updateInventoryQtyValue = 100;

  recordTelemetryForm = {
    shipmentId: null as any,
    recordedAt: '',
    temperature: 4.5,
    minThreshold: 2.0,
    maxThreshold: 8.0
  };

  ngOnInit() {
    this.fetchBatches();
    this.fetchSites();
    this.fetchProducts();

    this.fetchShipments();
    this.fetchInventory();
    this.fetchTelemetryLogs();
  }

  fetchShipments() {
    this.apiService.getShipments().subscribe({
      next: (res) => {
        if (res.data) {
          this.shipments.set(res.data || []);
          this.shipTotalPages.set(Math.ceil(res.data.length / this.pageSize) || 1);
        }
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching shipments.')
    });
  }

  fetchInventory() {
    this.apiService.getInventory().subscribe({
      next: (res) => {
        if (res.data) {
          this.inventory.set(res.data || []);
          this.invTotalPages.set(Math.ceil(res.data.length / this.pageSize) || 1);
        }
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching inventory.')
    });
  }

  fetchTelemetryLogs() {
    this.apiService.getColdChainLogs().subscribe({
      next: (res) => {
        if (res.data) {
          this.telemetry.set(res.data || []);
          this.telTotalPages.set(Math.ceil(res.data.length / this.pageSize) || 1);
        }
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching temperature logs.')
    });
  }

  fetchBatches() {
    this.apiService.getBatches().subscribe({
      next: (data) => this.batches.set(data || [])
    });
  }

  fetchSites() {
    this.apiService.getSites().subscribe({
      next: (res) => {
        if (res.success) {
          this.sites.set(res.data || []);
        }
      }
    });
  }

  fetchProducts() {
    this.apiService.getProducts().subscribe({
      next: (res) => {
        if (res.success) {
          this.products.set(res.data || []);
        }
      }
    });
  }

  paginatedShipments() {
    const start = (this.shipPage() - 1) * this.pageSize;
    return this.shipments().slice(start, start + this.pageSize);
  }

  paginatedInventory() {
    const start = (this.invPage() - 1) * this.pageSize;
    return this.inventory().slice(start, start + this.pageSize);
  }

  paginatedTelemetry() {
    const start = (this.telPage() - 1) * this.pageSize;
    return this.telemetry().slice(start, start + this.pageSize);
  }

  getProductName(productId: number): string {
    const p = this.products().find(item => item.productId === productId);
    return p ? p.productName : `Product ID: ${productId}`;
  }

  getSiteName(siteId: number): string {
    const s = this.sites().find(item => item.siteId === siteId);
    return s ? s.siteName : `Site ID: ${siteId}`;
  }

  getBatchNumber(batchId: number): string {
    const b = this.batches().find(item => item.batchId === batchId);
    return b ? b.batchNumber : `Batch ID: ${batchId}`;
  }

  openCreateShipmentModal() {
    this.createShipmentForm = {
      batchId: this.batches()[0]?.batchId || null,
      fromSiteId: this.sites()[0]?.siteId || null,
      toSiteId: this.sites()[1]?.siteId || this.sites()[0]?.siteId || null,
      shipmentDate: new Date().toISOString().substring(0, 10),
      quantityShipped: 450,
      unit: 'Vials',
      carrierName: 'DHL PharmaCold Express'
    };
    this.showCreateShipmentModal.set(true);
    this.clearMessages();
  }

  handleCreateShipment() {
    const payload = {
      ...this.createShipmentForm,
      batchId: parseInt(this.createShipmentForm.batchId, 10),
      fromSiteId: parseInt(this.createShipmentForm.fromSiteId, 10),
      toSiteId: parseInt(this.createShipmentForm.toSiteId, 10)
    };

    this.apiService.createShipment(payload).subscribe({
      next: () => {
        this.showSuccess('Shipment registered in Dispatched state.');
        this.showCreateShipmentModal.set(false);
        this.fetchShipments();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to create shipment.')
    });
  }

  openCreateInventoryModal() {
    this.createInventoryForm = {
      siteId: this.sites()[0]?.siteId || null,
      batchId: this.batches()[0]?.batchId || null,
      quantityReceived: 1000,
      quantityDispensed: 0,
      storageCondition: 'Keep Frozen -20°C'
    };
    this.showCreateInventoryModal.set(true);
    this.clearMessages();
  }

  handleCreateInventory() {
    const payload = {
      ...this.createInventoryForm,
      siteId: parseInt(this.createInventoryForm.siteId, 10),
      batchId: parseInt(this.createInventoryForm.batchId, 10)
    };

    this.apiService.createInventory(payload).subscribe({
      next: () => {
        this.showSuccess('Inventory log compiled successfully.');
        this.showCreateInventoryModal.set(false);
        this.fetchInventory();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to create inventory log.')
    });
  }

  openUpdateInventoryQtyModal(inv: any) {
    this.selectedInventoryForQty.set(inv);
    this.updateInventoryQtyType = 'received';
    this.updateInventoryQtyValue = 100;
    this.clearMessages();
  }

  handleUpdateInventoryQty() {
    const inv = this.selectedInventoryForQty();
    const qtyPayload = {
      siteId: inv.siteId,
      batchId: inv.batchId,
      quantityReceived: this.updateInventoryQtyType === 'received' ? this.updateInventoryQtyValue : 0,
      quantityDispensed: this.updateInventoryQtyType === 'dispensed' ? this.updateInventoryQtyValue : 0,
      storageCondition: inv.storageCondition
    };

    const request = this.updateInventoryQtyType === 'received' 
      ? this.apiService.updateReceivedQuantity(inv.inventoryId, qtyPayload)
      : this.apiService.updateDispensedQuantity(inv.inventoryId, qtyPayload);

    request.subscribe({
      next: () => {
        this.showSuccess('Inventory quantity balance updated successfully.');
        this.selectedInventoryForQty.set(null);
        this.fetchInventory();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to update inventory balance.')
    });
  }

  updateShipmentStatus(shipmentId: number, e: any) {
    const val = e.target.value;
    if (!val) return;

    this.apiService.updateShipment(shipmentId, { status: val }).subscribe({
      next: () => {
        this.showSuccess(`Shipment status successfully updated directly to: ${val}`);
        this.fetchShipments();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to shift shipment state.')
    });
    e.target.value = '';
  }

  openRecordTelemetryModal() {
    this.recordTelemetryForm = {
      shipmentId: this.shipments()[0]?.shipmentId || null,
      recordedAt: new Date().toISOString().substring(0, 16),
      temperature: 5.2,
      minThreshold: 2.0,
      maxThreshold: 8.0
    };
    this.showRecordTelemetryModal.set(true);
    this.clearMessages();
  }

  handleRecordTelemetry() {
    const payload = {
      ...this.recordTelemetryForm,
      shipmentId: parseInt(this.recordTelemetryForm.shipmentId, 10),
      recordedAt: this.recordTelemetryForm.recordedAt + ':00' // Append seconds
    };

    this.apiService.recordTemperatureLog(payload).subscribe({
      next: () => {
        this.showSuccess('Temperature log recorded successfully.');
        this.showRecordTelemetryModal.set(false);
        this.fetchTelemetryLogs();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to record sensor log.')
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

  clearMessages() {
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }

  confirmDiscard(): boolean {
    return window.confirm('Discard unsaved changes?');
  }
}
