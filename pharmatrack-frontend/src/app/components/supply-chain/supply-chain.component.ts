import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-supply-chain',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="supply-container">
      <div class="supply-header">
        <div>
          <h2>Logistics & Cold Chain Control</h2>
          <p>Supervise pharmaceutical shipment dispatches, site inventory balances, and real-time cold chain telemetry.</p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-primary" *ngIf="activeTab() === 'shipments'" (click)="openCreateShipmentModal()">
            +Create Shipment
          </button>
          <button class="btn btn-primary" *ngIf="activeTab() === 'inventory'" (click)="openCreateInventoryModal()">
            +Log Inventory Entry
          </button>
          <button class="btn btn-primary" *ngIf="activeTab() === 'telemetry'" (click)="openRecordTelemetryModal()">
            +Record Sensor Log
          </button>
        </div>
      </div>

      <!-- Side-by-side tabs on the same page -->
      <div class="tabs-nav">
        <button [class.active]="activeTab() === 'shipments'" (click)="activeTab.set('shipments')">Shipments (Logistics)</button>
        <button [class.active]="activeTab() === 'inventory'" (click)="activeTab.set('inventory')">Site Inventory Ledger</button>
        <button [class.active]="activeTab() === 'telemetry'" (click)="activeTab.set('telemetry')">Cold Chain Sensors (IoT)</button>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- 1. SHIPMENTS TAB -->
      <div class="tab-content" *ngIf="activeTab() === 'shipments'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Shipment ID</th>
                <th>Batch Number</th>
                <th>Origin Site</th>
                <th>Destination Site</th>
                <th>Shipment Date</th>
                <th>Quantity Shipped</th>
                <th>Carrier</th>
                <th>Status</th>
                <th style="width: 130px;">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let s of paginatedShipments()">
                <td style="font-weight: 700; color: #CE5200;">SHIP-{{ s.shipmentId }}</td>
                <td>{{ s.batch?.batchNumber }}</td>
                <td>{{ s.fromSite?.siteName }}</td>
                <td>{{ s.toSite?.siteName }}</td>
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
                      <option value="">-- Shift State --</option>
                      <option value="InTransit" *ngIf="s.status === 'Dispatched'">In Transit</option>
                      <option value="Delivered" *ngIf="s.status === 'InTransit'">Delivered</option>
                      <option value="Lost">Lost</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <span *ngIf="s.status === 'Delivered' || s.status === 'Lost' || s.status === 'Rejected'">Closed</span>
                </td>
              </tr>
              <tr *ngIf="shipments().length === 0">
                <td colspan="9" class="empty-state">No shipments registered.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="shipments().length > 0">
          <button [disabled]="shipPage() === 1" (click)="shipPage.set(shipPage() - 1)">Previous</button>
          <span>Page {{ shipPage() }} of {{ shipTotalPages() }}</span>
          <button [disabled]="shipPage() === shipTotalPages()" (click)="shipPage.set(shipPage() + 1)">Next</button>
        </div>
      </div>

      <!-- 2. INVENTORY TAB -->
      <div class="tab-content" *ngIf="activeTab() === 'inventory'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Site Name</th>
                <th>Batch Number</th>
                <th>Received</th>
                <th>Dispensed</th>
                <th>Balance Remaining</th>
                <th>Storage Specs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of paginatedInventory()">
                <td style="font-weight: 600;">{{ getSiteName(inv.siteId) }}</td>
                <td>{{ getBatchNumber(inv.batchId) }}</td>
                <td>{{ inv.quantityReceived }}</td>
                <td>{{ inv.quantityDispensed }}</td>
                <td style="font-weight: 700; color: #562200;">{{ inv.quantityReceived - inv.quantityDispensed }}</td>
                <td><span class="role-pill">{{ inv.storageCondition }}</span></td>
                <td>
                  <div class="actions-menu-wrap">
                    <button class="action-trigger" (click)="openUpdateInventoryQtyModal(inv)">Update Qty</button>
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
        <div class="pagination" *ngIf="inventory().length > 0">
          <button [disabled]="invPage() === 1" (click)="invPage.set(invPage() - 1)">Previous</button>
          <span>Page {{ invPage() }} of {{ invTotalPages() }}</span>
          <button [disabled]="invPage() === invTotalPages()" (click)="invPage.set(invPage() + 1)">Next</button>
        </div>
      </div>

      <!-- 3. TELEMETRY TAB -->
      <div class="tab-content" *ngIf="activeTab() === 'telemetry'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Sensor Log ID</th>
                <th>Shipment ID</th>
                <th>Timestamp</th>
                <th>Recorded Temperature</th>
                <th>Configured Range</th>
                <th>Excursion Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of paginatedTelemetry()">
                <td style="font-weight: 600;">SENS-{{ log.logId }}</td>
                <td>SHIP-{{ log.shipmentId }}</td>
                <td>{{ log.recordedAt | date:'medium' }}</td>
                <td [class.danger-text]="log.temperature < log.minThreshold || log.temperature > log.maxThreshold" style="font-weight: 700;">
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
        <div class="pagination" *ngIf="telemetry().length > 0">
          <button [disabled]="telPage() === 1" (click)="telPage.set(telPage() - 1)">Previous</button>
          <span>Page {{ telPage() }} of {{ telTotalPages() }}</span>
          <button [disabled]="telPage() === telTotalPages()" (click)="telPage.set(telPage() + 1)">Next</button>
        </div>
      </div>

      <!-- ── MODALS ── -->

      <!-- A. CREATE SHIPMENT MODAL -->
      <div class="modal-overlay" *ngIf="showCreateShipmentModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create Dispatch Shipment</h3>
            <button class="close-modal" (click)="showCreateShipmentModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateShipment()">
            <div class="field">
              <label>Select Batch Run</label>
              <select name="batchId" [(ngModel)]="createShipmentForm.batchId" required>
                <option *ngFor="let b of batches()" [value]="b.batchId">{{ b.batchNumber }} (Prod: {{ getProductName(b.productId) }})</option>
              </select>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Origin Site</label>
                <select name="fromSiteId" [(ngModel)]="createShipmentForm.fromSiteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Destination Site</label>
                <select name="toSiteId" [(ngModel)]="createShipmentForm.toSiteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Quantity Shipped</label>
                <input type="number" name="qty" [(ngModel)]="createShipmentForm.quantityShipped" required>
              </div>
              <div class="field">
                <label>Unit of Measure</label>
                <input type="text" name="unit" [(ngModel)]="createShipmentForm.unit" placeholder="e.g. Vials" required>
              </div>
            </div>
            <div class="field">
              <label>Logistics Carrier Name</label>
              <input type="text" name="carrier" [(ngModel)]="createShipmentForm.carrierName" placeholder="e.g. DHL ColdExpress" required>
            </div>
            <div class="field">
              <label>Shipment Date</label>
              <input type="date" name="shipD" [(ngModel)]="createShipmentForm.shipmentDate" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateShipmentModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Dispatch Shipment</button>
            </div>
          </form>
        </div>
      </div>

      <!-- B. CREATE INVENTORY MODAL -->
      <div class="modal-overlay" *ngIf="showCreateInventoryModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Log Site Inventory Balance</h3>
            <button class="close-modal" (click)="showCreateInventoryModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateInventory()">
            <div class="form-row">
              <div class="field">
                <label>Investigation Site</label>
                <select name="invSite" [(ngModel)]="createInventoryForm.siteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Batch Reference</label>
                <select name="invBatch" [(ngModel)]="createInventoryForm.batchId" required>
                  <option *ngFor="let b of batches()" [value]="b.batchId">{{ b.batchNumber }}</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Quantity Received</label>
                <input type="number" name="rcv" [(ngModel)]="createInventoryForm.quantityReceived" required>
              </div>
              <div class="field">
                <label>Quantity Dispensed</label>
                <input type="number" name="dsp" [(ngModel)]="createInventoryForm.quantityDispensed" required>
              </div>
            </div>
            <div class="field">
              <label>Storage Condition Parameters</label>
              <input type="text" name="store" [(ngModel)]="createInventoryForm.storageCondition" placeholder="e.g. Keep at 2-8°C" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateInventoryModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Log Entry</button>
            </div>
          </form>
        </div>
      </div>

      <!-- C. UPDATE INVENTORY MODAL -->
      <div class="modal-overlay" *ngIf="selectedInventoryForQty()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Update Site Inventory Quantities</h3>
            <button class="close-modal" (click)="selectedInventoryForQty.set(null)">×</button>
          </div>
          <form (ngSubmit)="handleUpdateInventoryQty()">
            <div class="detail-item" style="margin-bottom: 12px; font-size: 13.5px;">
              <span>Site:</span> <strong>{{ getSiteName(selectedInventoryForQty().siteId) }}</strong> | 
              <span>Batch:</span> <strong>{{ getBatchNumber(selectedInventoryForQty().batchId) }}</strong>
            </div>
            <div class="field">
              <label>Action Type</label>
              <select name="qtyAction" [(ngModel)]="updateInventoryQtyType">
                <option value="received">Record Received Quantity</option>
                <option value="dispensed">Record Dispensed Quantity</option>
              </select>
            </div>
            <div class="field">
              <label>Add Quantity Value</label>
              <input type="number" name="qtyVal" [(ngModel)]="updateInventoryQtyValue" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="selectedInventoryForQty.set(null)">Cancel</button>
              <button type="submit" class="btn btn-primary">Update Qty</button>
            </div>
          </form>
        </div>
      </div>

      <!-- D. RECORD TELEMETRY MODAL -->
      <div class="modal-overlay" *ngIf="showRecordTelemetryModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Record Temperature Sensor Log</h3>
            <button class="close-modal" (click)="showRecordTelemetryModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleRecordTelemetry()">
            <div class="field">
              <label>Associated Shipment ID</label>
              <select name="telShip" [(ngModel)]="recordTelemetryForm.shipmentId" required>
                <option *ngFor="let s of shipments()" [value]="s.shipmentId">SHIP-{{ s.shipmentId }} (Carrier: {{ s.carrierName }})</option>
              </select>
            </div>
            <div class="field">
              <label>Recorded Temperature (°C)</label>
              <input type="number" step="0.1" name="tempVal" [(ngModel)]="recordTelemetryForm.temperature" required>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Min Configured Range Limit (°C)</label>
                <input type="number" step="0.1" name="telMin" [(ngModel)]="recordTelemetryForm.minThreshold" required>
              </div>
              <div class="field">
                <label>Max Configured Range Limit (°C)</label>
                <input type="number" step="0.1" name="telMax" [(ngModel)]="recordTelemetryForm.maxThreshold" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showRecordTelemetryModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Record Log</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .supply-container {
      background: #ffffff;
      border: 1px solid #ece4dc;
      border-radius: 14px;
      padding: 32px;
    }
    .supply-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .supply-header h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #211611;
      margin: 0 0 6px;
    }
    .supply-header p {
      color: #7a6a5e;
      font-size: 14px;
      margin: 0;
    }
    .tabs-nav {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid #ece4dc;
      margin-bottom: 24px;
      padding-bottom: 8px;
    }
    .tabs-nav button {
      background: none;
      border: none;
      padding: 10px 18px;
      font-size: 14.5px;
      font-weight: 600;
      color: #7a6a5e;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .tabs-nav button:hover {
      background: #fbe9de;
      color: #CE5200;
    }
    .tabs-nav button.active {
      background: #fbe9de;
      color: #CE5200;
      border: 1px solid #ece4dc;
    }
    .table-container {
      overflow-x: auto;
      margin-bottom: 20px;
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
    .status-indicator {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-draft {
      background: #f7f5f2;
      color: #7a6a5e;
      border: 1px solid #ece4dc;
    }
    .status-active {
      background: #e8f5e9;
      color: #2e7d32;
      border: 1px solid #c8e6c9;
    }
    .status-completed {
      background: #e8f1fa;
      color: #1d5f9e;
      border: 1px solid #bbdefb;
    }
    .status-terminated {
      background: #fbeceb;
      color: #b3261e;
      border: 1px solid #ffcdd2;
    }
    .danger-text {
      color: #b3261e;
    }
    .inline-select {
      padding: 6px 10px;
      border: 1px solid #ece4dc;
      border-radius: 6px;
      outline: none;
      font-size: 13px;
      background: #ffffff;
    }
    .action-trigger {
      background: none;
      border: 1px solid #ece4dc;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      color: #211611;
    }
    .action-trigger:hover {
      border-color: #CE5200;
      background: #fdfcfb;
    }
    .pagination {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 16px;
      font-size: 13.5px;
      color: #7a6a5e;
    }
    .pagination button {
      background: #ffffff;
      border: 1px solid #ece4dc;
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      color: #211611;
    }
    .pagination button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      font-family: inherit;
    }
    .btn-primary {
      background: #CE5200;
      color: #fff;
    }
    .btn-primary:hover {
      background: #562200;
    }
    .btn-secondary {
      background: #ffffff;
      border: 1px solid #ece4dc;
      color: #211611;
    }
    .btn-secondary:hover {
      background: #fbe9de;
      color: #CE5200;
    }
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(42, 20, 8, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .modal-card {
      background: #ffffff;
      border-radius: 14px;
      width: 100%;
      max-width: 500px;
      padding: 32px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #ece4dc;
      padding-bottom: 12px;
    }
    .modal-header h3 {
      font-family: 'Manrope', sans-serif;
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #211611;
    }
    .close-modal {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #7a6a5e;
    }
    .field {
      text-align: left;
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      font-size: 13px;
      font-weight: 700;
      color: #211611;
    }
    .field input, .field select {
      padding: 10px 12px;
      border: 1px solid #ece4dc;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
      background: #ffffff;
    }
    .field input:focus, .field select:focus {
      border-color: #CE5200;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #ece4dc;
      padding-top: 16px;
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
    .role-pill {
      background: #fbe9de;
      color: #CE5200;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
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
}
