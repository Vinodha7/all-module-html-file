import { Component, inject, signal, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-supply-chain',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ══════════ LIST VIEW ══════════ -->
    <div *ngIf="!detail()">
      <div class="page-head">
        <div>
          <h1 class="page-title">Supply &amp; Cold Chain</h1>
          <div class="page-sub">Shipments, cold-chain readings and site inventory</div>
        </div>
        <div class="tooltip-wrap">
          <button class="btn btn-primary" *ngIf="activeTab() === 'shipments'" (click)="openCreateShipment()" aria-label="Create Shipment">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Create
          </button>
          <button class="btn btn-primary" *ngIf="activeTab() === 'coldchain'" (click)="openRecordReading()" aria-label="Create Temperature Log">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Create
          </button>
          <button class="btn btn-primary" *ngIf="activeTab() === 'inventory'" (click)="openCreateInventory()" aria-label="Create Inventory">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg> Create
          </button>
          <span class="tooltip-bubble">{{ activeTab() === 'shipments' ? 'Create Shipment' : activeTab() === 'coldchain' ? 'Create Temperature Log' : 'Create Inventory' }}</span>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>
      <div class="alert alert-info" *ngIf="infoMsg()">{{ infoMsg() }}</div>

      <!-- TABS -->
      <div class="tabs">
        <button class="tab" [class.active]="activeTab() === 'shipments'" (click)="activeTab.set('shipments')">Shipments</button>
        <button class="tab" [class.active]="activeTab() === 'coldchain'" (click)="activeTab.set('coldchain')">Cold Chain</button>
        <button class="tab" [class.active]="activeTab() === 'inventory'" (click)="activeTab.set('inventory')">Inventory</button>
      </div>

      <!-- ══════ SHIPMENTS TAB ══════ -->
      <div *ngIf="activeTab() === 'shipments'">
        <div class="kpi-grid">
          <div class="kpi-card tone-neutral">
            <div class="kpi-top"><div class="kpi-label">Total Shipments</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div></div>
            <div class="kpi-value">{{ shipments().length }}</div>
          </div>
          <div class="kpi-card tone-warning">
            <div class="kpi-top"><div class="kpi-label">In Transit</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div></div>
            <div class="kpi-value">{{ countShipStatus('InTransit') }}</div>
          </div>
          <div class="kpi-card tone-green">
            <div class="kpi-top"><div class="kpi-label">Delivered</div><div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div></div>
            <div class="kpi-value">{{ countShipStatus('Delivered') }}</div>
          </div>
        </div>

        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search carrier or batch..." [(ngModel)]="shipSearch" (ngModelChange)="shipPage.set(1)">
          </div>
          <div class="filter-select">
            <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="shipStatusFilter" (ngModelChange)="shipPage.set(1)" aria-label="Filter by Status">
              <option value="All statuses">All statuses</option>
              <option value="Dispatched">Dispatched</option>
              <option value="InTransit">InTransit</option>
              <option value="Delivered">Delivered</option>
              <option value="Lost">Lost</option>
              <option value="Rejected">Rejected</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <div class="table-card">
          <div class="table-card-head"><h3>Shipments</h3><span class="count">{{ filteredShipments().length }} records</span></div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Batch</th><th>Route</th><th>Carrier</th><th>Status</th><th style="text-align:center;">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of pagedShipments()">
                  <td class="name-cell">{{ s.batch?.batchNumber || getBatchNumber(s.batchId) }}</td>
                  <td class="route"><b>{{ s.fromSite?.siteName || getSiteName(s.fromSiteId) }}</b> → {{ s.toSite?.siteName || getSiteName(s.toSiteId) }}</td>
                  <td>{{ s.carrierName }}</td>
                  <td><span class="badge-status" [ngClass]="shipBadge(s.status)">{{ s.status }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleMenu('shp-' + s.shipmentId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'shp-' + s.shipmentId">
                        <button type="button" class="dropdown-item" (click)="viewShipment(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" *ngIf="s.status === 'Dispatched'" (click)="openEditShipment(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg> Edit</button>
                        <button type="button" class="dropdown-item" *ngIf="s.status === 'Dispatched' || s.status === 'InTransit'" (click)="openUpdateStatus(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg> Update</button>
                        <button type="button" class="dropdown-item" *ngIf="s.status === 'InTransit'" (click)="viewColdChainLogs(s)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg> Logs</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredShipments().length === 0">
                  <td colspan="5"><div class="empty-state">No shipments registered.</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer" *ngIf="filteredShipments().length > 0">
            <div>Showing {{ pagedShipments().length }} of {{ filteredShipments().length }} shipments</div>
            <div class="pager" *ngIf="shipTotalPages() > 1">
              <button [disabled]="shipPage() === 1" (click)="shipPage.set(shipPage() - 1)" aria-label="Previous page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
              <span>Page {{ shipPage() }} of {{ shipTotalPages() }}</span>
              <button [disabled]="shipPage() === shipTotalPages()" (click)="shipPage.set(shipPage() + 1)" aria-label="Next page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════ COLD CHAIN TAB ══════ -->
      <div *ngIf="activeTab() === 'coldchain'">
        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search shipment ID..." [(ngModel)]="coldSearch" (ngModelChange)="telPage.set(1)">
          </div>
          <div class="filter-select">
            <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="coldReadingFilter" (ngModelChange)="telPage.set(1)" aria-label="Filter readings">
              <option value="All readings">All readings</option>
              <option value="Excursions only">Excursions only</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <div class="table-card">
          <div class="table-card-head"><h3>Cold-Chain Readings</h3><span class="count">{{ filteredTelemetry().length }} records</span></div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Shipment Code</th><th>Recorded At</th><th>Temperature</th><th>Threshold</th><th>Status</th><th style="text-align:center;">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let log of pagedTelemetry()">
                  <td class="name-cell ref-accent">{{ fmtShip(log.shipmentId || log.shipment?.shipmentId) }}</td>
                  <td>{{ log.recordedAt | date:'medium' }}</td>
                  <td class="temp-value" [class.danger-text]="isExcursion(log)">{{ log.temperature }} °C</td>
                  <td>{{ log.minThreshold }}–{{ log.maxThreshold }} °C</td>
                  <td><span class="badge-status" [ngClass]="isExcursion(log) ? 'badge-excursion' : 'badge-delivered'">{{ isExcursion(log) ? 'Excursion' : 'Normal' }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleMenu('log-' + log.logId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'log-' + log.logId">
                        <button type="button" class="dropdown-item" (click)="viewReading(log)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredTelemetry().length === 0">
                  <td colspan="6"><div class="empty-state">No sensor logs compiled yet.</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer" *ngIf="filteredTelemetry().length > 0">
            <div>Showing {{ pagedTelemetry().length }} of {{ filteredTelemetry().length }} readings</div>
            <div class="pager" *ngIf="telTotalPages() > 1">
              <button [disabled]="telPage() === 1" (click)="telPage.set(telPage() - 1)" aria-label="Previous page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
              <span>Page {{ telPage() }} of {{ telTotalPages() }}</span>
              <button [disabled]="telPage() === telTotalPages()" (click)="telPage.set(telPage() + 1)" aria-label="Next page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════ INVENTORY TAB ══════ -->
      <div *ngIf="activeTab() === 'inventory'">
        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search site or batch..." [(ngModel)]="invSearch" (ngModelChange)="invPage.set(1)">
          </div>
          <div class="filter-select">
            <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="invSiteFilter" (ngModelChange)="invPage.set(1)" aria-label="Filter by Site">
              <option value="">All Sites</option>
              <option *ngFor="let st of sites()" [value]="st.siteId">{{ st.siteName }}</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
          <div class="filter-select">
            <svg class="funnel" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="invBatchFilter" (ngModelChange)="invPage.set(1)" aria-label="Filter by Batch">
              <option value="">All Batches</option>
              <option *ngFor="let b of batches()" [value]="b.batchId">{{ b.batchNumber }}</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <div class="table-card">
          <div class="table-card-head"><h3>Site Inventory</h3><span class="count">{{ filteredInventory().length }} records</span></div>
          <div class="table-scroll">
            <table>
              <thead><tr><th>Site</th><th>Batch</th><th>Qty Received</th><th>Qty Dispensed</th><th>Qty On Hand</th><th>Storage</th><th style="text-align:center;">Actions</th></tr></thead>
              <tbody>
                <tr *ngFor="let inv of pagedInventory()">
                  <td class="name-cell">{{ getSiteName(inv.siteId) }}</td>
                  <td>{{ getBatchNumber(inv.batchId) }}</td>
                  <td class="mono">{{ num(inv.quantityReceived) }}</td>
                  <td class="mono">{{ num(inv.quantityDispensed) }}</td>
                  <td class="onhand" [class.low]="isLow(inv)">{{ num(onHand(inv)) }}<span class="low-badge" *ngIf="isLow(inv)">LOW</span></td>
                  <td><span class="storage-tag">{{ inv.storageCondition || '—' }}</span></td>
                  <td class="actions-cell">
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleMenu('inv-' + inv.inventoryId, $event)" aria-label="Row actions"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg></button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openMenu() === 'inv-' + inv.inventoryId">
                        <button type="button" class="dropdown-item" (click)="viewInventory(inv)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg> View</button>
                        <button type="button" class="dropdown-item" (click)="openUpdateQty(inv, 'received')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg> Received</button>
                        <button type="button" class="dropdown-item" (click)="openUpdateQty(inv, 'dispensed')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></svg> Dispensed</button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredInventory().length === 0">
                  <td colspan="7"><div class="empty-state">No site inventory logs compiled.</div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="table-footer" *ngIf="filteredInventory().length > 0">
            <div>Showing {{ pagedInventory().length }} of {{ filteredInventory().length }} records</div>
            <div class="pager" *ngIf="invTotalPages() > 1">
              <button [disabled]="invPage() === 1" (click)="invPage.set(invPage() - 1)" aria-label="Previous page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
              <span>Page {{ invPage() }} of {{ invTotalPages() }}</span>
              <button [disabled]="invPage() === invTotalPages()" (click)="invPage.set(invPage() + 1)" aria-label="Next page"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ DETAIL VIEW: SHIPMENT ══════════ -->
    <div *ngIf="detail() as d">
      <ng-container *ngIf="d.type === 'shipment'">
        <div class="breadcrumb"><a (click)="closeDetail()">Supply Chain</a> / <a (click)="backToTab('shipments')">Shipments</a> / <strong>{{ fmtShip(d.data.shipmentId) }}</strong></div>
        <div class="view-card">
          <div class="detail-head">
            <div class="title-row">
              <h1 class="page-title">{{ fmtShip(d.data.shipmentId) }}</h1>
              <span class="badge-status" [ngClass]="shipBadge(d.data.status)">{{ d.data.status }}</span>
            </div>
            <div class="status-action-btns">
              <button class="status-action-btn" *ngIf="d.data.status === 'Dispatched'" (click)="openEditShipment(d.data)">Edit</button>
              <button class="status-action-btn" *ngIf="d.data.status === 'Dispatched' || d.data.status === 'InTransit'" (click)="openUpdateStatus(d.data)">Update</button>
            </div>
          </div>

          <div class="detail-card">
            <h3>Shipment Details</h3>
            <div class="field-grid">
              <div class="detail-field"><label>Batch</label><div class="value">{{ d.data.batch?.batchNumber || getBatchNumber(d.data.batchId) }}</div></div>
              <div class="detail-field"><label>Carrier</label><div class="value">{{ d.data.carrierName }}</div></div>
              <div class="detail-field"><label>From Site</label><div class="value">{{ d.data.fromSite?.siteName || getSiteName(d.data.fromSiteId) }}</div></div>
              <div class="detail-field"><label>To Site</label><div class="value">{{ d.data.toSite?.siteName || getSiteName(d.data.toSiteId) }}</div></div>
              <div class="detail-field"><label>Shipment Date</label><div class="value">{{ d.data.shipmentDate }}</div></div>
              <div class="detail-field"><label>Quantity Shipped</label><div class="value">{{ d.data.quantityShipped }} {{ d.data.unit }}</div></div>
              <div class="detail-field"><label>Status</label><div class="value">{{ d.data.status }}</div></div>
            </div>
          </div>

          <div class="detail-card">
            <h3>Chain of Custody</h3>
            <div class="timeline">
              <div class="t-step" *ngFor="let step of custody(d.data)" [class.pending]="step.pending" [class.bad]="step.bad">
                <div class="t-rail"><div class="t-dot"></div><div class="t-line"></div></div>
                <div><div class="t-title">{{ step.title }}</div><div class="t-sub">{{ step.sub }}</div></div>
              </div>
            </div>
          </div>

          <div class="detail-card">
            <h3>Linked Cold Chain Logs</h3>
            <table class="mini-table">
              <thead><tr><th>Recorded At</th><th>Temperature</th><th>Threshold</th><th>Status</th></tr></thead>
              <tbody>
                <tr *ngFor="let log of logsForShipment(d.data.shipmentId)">
                  <td>{{ log.recordedAt | date:'medium' }}</td>
                  <td [class.danger-text]="isExcursion(log)">{{ log.temperature }} °C</td>
                  <td>{{ log.minThreshold }}–{{ log.maxThreshold }} °C</td>
                  <td><span class="badge-status" [ngClass]="isExcursion(log) ? 'badge-excursion' : 'badge-delivered'">{{ isExcursion(log) ? 'Excursion' : 'Normal' }}</span></td>
                </tr>
                <tr *ngIf="logsForShipment(d.data.shipmentId).length === 0"><td colspan="4" class="mini-empty">No cold-chain readings linked to this shipment.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

      <!-- DETAIL VIEW: INVENTORY -->
      <ng-container *ngIf="d.type === 'inventory'">
        <div class="breadcrumb"><a (click)="closeDetail()">Supply Chain</a> / <a (click)="backToTab('inventory')">Inventory</a> / <strong>{{ getSiteName(d.data.siteId) }} · {{ getBatchNumber(d.data.batchId) }}</strong></div>
        <div class="view-card">
          <div class="detail-head">
            <div class="title-row"><h1 class="page-title">{{ getSiteName(d.data.siteId) }} · {{ getBatchNumber(d.data.batchId) }}</h1></div>
            <div class="status-action-btns">
              <button class="status-action-btn" (click)="openUpdateQty(d.data, 'received')">Received</button>
              <button class="status-action-btn" (click)="openUpdateQty(d.data, 'dispensed')">Dispensed</button>
            </div>
          </div>
          <div class="detail-card">
            <h3>Inventory Details</h3>
            <div class="field-grid">
              <div class="detail-field"><label>Site</label><div class="value">{{ getSiteName(d.data.siteId) }}</div></div>
              <div class="detail-field"><label>Batch</label><div class="value">{{ getBatchNumber(d.data.batchId) }}</div></div>
              <div class="detail-field"><label>Quantity Received</label><div class="value">{{ num(d.data.quantityReceived) }}</div></div>
              <div class="detail-field"><label>Quantity Dispensed</label><div class="value">{{ num(d.data.quantityDispensed) }}</div></div>
              <div class="detail-field"><label>Quantity On Hand</label><div class="value onhand-lg">{{ num(onHand(d.data)) }}</div></div>
              <div class="detail-field"><label>Storage Condition</label><div class="value">{{ d.data.storageCondition || '—' }}</div></div>
            </div>
            <div class="formula-note">Quantity On Hand = Quantity Received − Quantity Dispensed (computed, not directly editable)</div>
          </div>
          <div class="meta-footer" *ngIf="d.data.lastUpdated"><div><b>Last updated:</b> {{ d.data.lastUpdated | date:'medium' }}</div></div>
        </div>
      </ng-container>

      <!-- DETAIL VIEW: COLD CHAIN READING -->
      <ng-container *ngIf="d.type === 'coldchain'">
        <div class="breadcrumb"><a (click)="closeDetail()">Supply Chain</a> / <a (click)="backToTab('coldchain')">Cold Chain</a> / <strong>{{ fmtLog(d.data.logId) }}</strong></div>
        <div class="view-card">
          <div class="detail-head">
            <div class="title-row">
              <h1 class="page-title">{{ fmtLog(d.data.logId) }}</h1>
              <span class="badge-status" [ngClass]="isExcursion(d.data) ? 'badge-excursion' : 'badge-delivered'">{{ isExcursion(d.data) ? 'Excursion' : 'Normal' }}</span>
            </div>
          </div>
          <div class="detail-card">
            <h3>Reading Details</h3>
            <div class="field-grid">
              <div class="detail-field"><label>Shipment ID</label><div class="value">{{ fmtShip(d.data.shipmentId || d.data.shipment?.shipmentId) }}</div></div>
              <div class="detail-field"><label>Recorded At</label><div class="value">{{ d.data.recordedAt | date:'medium' }}</div></div>
              <div class="detail-field"><label>Temperature</label><div class="value" [class.danger-text]="isExcursion(d.data)">{{ d.data.temperature }} °C</div></div>
              <div class="detail-field"><label>Min / Max Threshold</label><div class="value">{{ d.data.minThreshold }} °C / {{ d.data.maxThreshold }} °C</div></div>
            </div>
          </div>
          <div class="detail-card">
            <div class="immutable-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <div>Cold-chain readings cannot be edited once recorded, to preserve an accurate audit trail. If this reading was entered incorrectly, escalate it to a Deviation, which supports a documented root-cause and correction record instead of a silent edit.</div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- ══════════ MODAL: CREATE / EDIT SHIPMENT ══════════ -->
    <div class="modal-overlay" *ngIf="showShipmentModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showShipmentModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>{{ shipmentEditing ? 'Edit Shipment — ' + fmtShip(shipmentForm.shipmentId) : 'Create Shipment' }}</h2>
        <div class="modal-sub" *ngIf="shipmentEditing">Editable only while Status = Dispatched. Batch and route are fixed once created.</div>
        <div class="alert alert-error modal-alert" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <form (ngSubmit)="saveShipment()">
          <div class="form-grid">
            <div class="field">
              <label>Batch<span class="req">*</span></label>
              <select name="batchId" [(ngModel)]="shipmentForm.batchId" [disabled]="shipmentEditing" required>
                <option value="" disabled>Select…</option>
                <option *ngFor="let b of batches()" [value]="b.batchId">{{ b.batchNumber }} (Prod: {{ getProductName(b.productId) }})</option>
              </select>
            </div>
            <div class="field">
              <label>Carrier<span class="req">*</span></label>
              <select name="carrier" [(ngModel)]="shipmentForm.carrierName" required>
                <option value="" disabled>Select…</option>
                <option *ngFor="let c of carriers" [value]="c">{{ c }}</option>
              </select>
            </div>
            <div class="field">
              <label>From Site<span class="req">*</span></label>
              <select name="fromSiteId" [(ngModel)]="shipmentForm.fromSiteId" [disabled]="shipmentEditing" required>
                <option value="" disabled>Select…</option>
                <option *ngFor="let st of sites()" [value]="st.siteId">{{ st.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>To Site<span class="req">*</span></label>
              <select name="toSiteId" [(ngModel)]="shipmentForm.toSiteId" [disabled]="shipmentEditing" required>
                <option value="" disabled>Select…</option>
                <option *ngFor="let st of sites()" [value]="st.siteId">{{ st.siteName }}</option>
              </select>
            </div>
            <div class="field"><label>Shipment Date<span class="req">*</span></label><input type="date" name="shipD" [(ngModel)]="shipmentForm.shipmentDate" required></div>
            <div class="field"><label>Quantity Shipped<span class="req">*</span></label><input type="number" name="qty" [(ngModel)]="shipmentForm.quantityShipped" required></div>
            <div class="field"><label>Unit<span class="req">*</span></label><input type="text" name="unit" [(ngModel)]="shipmentForm.unit" placeholder="e.g. Vials" required></div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ MODAL: UPDATE SHIPMENT STATUS ══════════ -->
    <div class="modal-overlay" *ngIf="showStatusModal()" style="display:flex;">
      <div class="modal modal-narrow">
        <button type="button" class="modal-close-x" (click)="showStatusModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Update Status — {{ fmtShip(statusForm.shipmentId) }}</h2>
        <div class="modal-sub">{{ statusForm.batchNumber }} · {{ statusForm.route }}</div>
        <div class="alert alert-error modal-alert" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <form (ngSubmit)="saveStatus()">
          <div class="current-status">
            <div><div class="cs-label">Current Status</div><div class="cs-val">{{ statusForm.currentStatus }}</div></div>
            <span class="badge-status" [ngClass]="shipBadge(statusForm.currentStatus)">{{ statusForm.currentStatus }}</span>
          </div>
          <div class="field">
            <label>New Status<span class="req">*</span></label>
            <div class="status-options">
              <label class="option" *ngFor="let opt of statusOptions()" [class.selected]="statusForm.newStatus === opt" (click)="statusForm.newStatus = opt">
                <input type="radio" name="newStatus" [value]="opt" [(ngModel)]="statusForm.newStatus"> {{ opt }}
              </label>
            </div>
            <div class="empty-note" *ngIf="statusOptions().length === 0">This shipment is in a terminal state and cannot transition further.</div>
          </div>
          <div class="field" *ngIf="statusForm.newStatus === 'Lost' || statusForm.newStatus === 'Rejected'">
            <label>Reason / Notes<span class="req">*</span></label>
            <textarea rows="3" name="reason" [(ngModel)]="statusForm.reason" placeholder="Required when marking as Lost or Rejected..."></textarea>
            <div class="required-note">⚠ Required for Lost / Rejected. Deviation linkage is handled by the Deviation module.</div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving() || statusOptions().length === 0">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ MODAL: ADD INVENTORY ══════════ -->
    <div class="modal-overlay" *ngIf="showInventoryModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showInventoryModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Add Inventory</h2>
        <div class="alert alert-error modal-alert" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <form (ngSubmit)="saveInventory()">
          <div class="form-grid">
            <div class="field">
              <label>Site<span class="req">*</span></label>
              <select name="invSite" [(ngModel)]="inventoryForm.siteId" required>
                <option value="" disabled>Select…</option>
                <option *ngFor="let st of sites()" [value]="st.siteId">{{ st.siteName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Batch<span class="req">*</span></label>
              <select name="invBatch" [(ngModel)]="inventoryForm.batchId" required>
                <option value="" disabled>Select…</option>
                <option *ngFor="let b of batches()" [value]="b.batchId">{{ b.batchNumber }}</option>
              </select>
            </div>
            <div class="field"><label>Quantity Received<span class="req">*</span></label><input type="number" name="rcv" [(ngModel)]="inventoryForm.quantityReceived" required></div>
            <div class="field"><label>Quantity Dispensed<span class="req">*</span></label><input type="number" name="dsp" [(ngModel)]="inventoryForm.quantityDispensed" required></div>
            <div class="field field-full"><label>Storage Condition</label><input type="text" name="store" [(ngModel)]="inventoryForm.storageCondition" placeholder="e.g. Refrigerated 2–8°C"></div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ MODAL: UPDATE INVENTORY QUANTITY ══════════ -->
    <div class="modal-overlay" *ngIf="showQtyModal()" style="display:flex;">
      <div class="modal modal-narrow">
        <button type="button" class="modal-close-x" (click)="showQtyModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Update Inventory Quantity</h2>
        <div class="modal-sub">{{ getSiteName(qtyForm.siteId) }} · {{ getBatchNumber(qtyForm.batchId) }}</div>
        <div class="toggle">
          <button type="button" class="toggle-opt" [class.active]="qtyForm.mode === 'received'" (click)="qtyForm.mode = 'received'">Received Quantity</button>
          <button type="button" class="toggle-opt" [class.active]="qtyForm.mode === 'dispensed'" (click)="qtyForm.mode = 'dispensed'">Dispensed Quantity</button>
        </div>
        <div class="current-status">
          <div><div class="cs-label">Current {{ qtyForm.mode === 'received' ? 'Quantity Received' : 'Quantity Dispensed' }}</div><div class="cs-val">{{ num(qtyForm.mode === 'received' ? qtyForm.currentReceived : qtyForm.currentDispensed) }}</div></div>
          <div><div class="cs-label">On Hand</div><div class="cs-val">{{ num(qtyForm.currentReceived - qtyForm.currentDispensed) }}</div></div>
        </div>
        <div class="alert alert-error modal-alert" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <form (ngSubmit)="saveQty()">
          <div class="field">
            <label>Add to {{ qtyForm.mode === 'received' ? 'Received' : 'Dispensed' }} Quantity<span class="req">*</span></label>
            <input type="number" step="0.01" name="qtyVal" [(ngModel)]="qtyForm.amount" placeholder="e.g. 50" required>
            <div class="field-hint">This amount is added to the current {{ qtyForm.mode }} quantity.</div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>

    <!-- ══════════ MODAL: RECORD READING ══════════ -->
    <div class="modal-overlay" *ngIf="showReadingModal()" style="display:flex;">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="showReadingModal.set(false)" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
        <h2>Create Temperature Log</h2>
        <div class="info-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <div>Excursion status is derived automatically when the temperature falls outside the min/max thresholds.</div>
        </div>
        <div class="alert alert-error modal-alert" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <form (ngSubmit)="saveReading()">
          <div class="form-grid">
            <div class="field field-full">
              <label>Shipment<span class="req">*</span></label>
              <select name="telShip" [(ngModel)]="readingForm.shipmentId" required>
                <option value="" disabled>Select…</option>
                <option *ngFor="let s of shipments()" [value]="s.shipmentId">{{ fmtShip(s.shipmentId) }} (Carrier: {{ s.carrierName }})</option>
              </select>
            </div>
            <div class="field field-full"><label>Recorded At<span class="req">*</span></label><input type="datetime-local" name="recAt" [(ngModel)]="readingForm.recordedAt" required></div>
            <div class="field field-full"><label>Temperature (°C)<span class="req">*</span></label><input type="number" step="0.1" name="tempVal" [(ngModel)]="readingForm.temperature" required></div>
            <div class="field"><label>Min Threshold (°C)<span class="req">*</span></label><input type="number" step="0.1" name="telMin" [(ngModel)]="readingForm.minThreshold" required></div>
            <div class="field"><label>Max Threshold (°C)<span class="req">*</span></label><input type="number" step="0.1" name="telMax" [(ngModel)]="readingForm.maxThreshold" required></div>
          </div>
          <div class="modal-footer"><button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Saving…' : 'Save' }}</button></div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;}

    /* TABS */
    .tabs{display:flex;gap:26px;border-bottom:1px solid var(--border);margin-bottom:24px;}
    .tab{padding:10px 2px;font-size:14px;font-weight:600;color:var(--text-dim);cursor:pointer;background:none;border:none;border-bottom:2px solid transparent;font-family:inherit;transition:color .15s ease,border-color .15s ease;}
    .tab:hover{color:var(--text);}
    .tab.active{color:var(--accent-dark);border-bottom-color:var(--accent);}

    /* FILTER SELECT (matches Regulatory) */
    .filter-select{position:relative;display:inline-flex;align-items:center;min-width:180px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;}
    .filter-select .funnel{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select .caret{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--text-dim);pointer-events:none;}
    .filter-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;width:100%;border:none;background:transparent;border-radius:var(--radius-sm);padding:11px 34px 11px 36px;font-size:14px;color:var(--text);font-family:inherit;cursor:pointer;}
    .filter-select select:focus{outline:none;}

    .tooltip-wrap{position:relative;display:inline-flex;}
    .tooltip-wrap .tooltip-bubble{position:absolute;bottom:calc(100% + 10px);right:0;background:var(--text);color:#fff;font-size:12.5px;font-weight:600;padding:7px 12px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transform:translateY(4px);transition:opacity .15s ease, transform .15s ease;z-index:40;}
    .tooltip-wrap:hover .tooltip-bubble{opacity:1;transform:translateY(0);}

    .actions-cell{text-align:center;}
    .route{color:var(--text-dim);}
    .route b{color:var(--text);font-weight:600;}
    .ref-accent{color:var(--accent-dark);font-weight:700;}
    .mono{font-variant-numeric:tabular-nums;}
    .empty-state{text-align:center;color:var(--text-dim);font-style:italic;padding:24px;}

    /* STATUS BADGES (rust-adapted) */
    .badge-status{display:inline-block;padding:5px 12px;border-radius:20px;font-size:12.5px;font-weight:700;white-space:nowrap;}
    .badge-dispatched{background:var(--blue-light);color:var(--blue);}
    .badge-transit{background:var(--warning-light);color:var(--warning);}
    .badge-delivered{background:#e6f4ec;color:#2f7d4f;}
    .badge-lost{background:#f4e3e1;color:#7a2e26;}
    .badge-rejected{background:var(--danger-light);color:var(--danger);}
    .badge-excursion{background:var(--danger-light);color:var(--danger);}

    /* KPI green tone */
    .tone-green .kpi-icon{background:#e6f4ec;color:#2f7d4f;}
    .tone-green .kpi-value{color:#2f7d4f;}

    /* TEMPERATURE + INVENTORY */
    .temp-value{font-weight:700;font-variant-numeric:tabular-nums;}
    .danger-text{color:var(--danger);}
    .onhand{font-weight:700;color:#2f7d4f;font-variant-numeric:tabular-nums;}
    .onhand.low{color:var(--danger);}
    .low-badge{font-size:10.5px;font-weight:700;background:var(--danger-light);color:var(--danger);padding:2px 8px;border-radius:12px;margin-left:8px;}
    .storage-tag{background:var(--accent-light);color:var(--accent-dark);padding:3px 10px;border-radius:20px;font-size:12.5px;font-weight:600;}

    /* MENU NOTE */
    .menu-note{font-size:11px;color:var(--text-dim);font-style:italic;padding:8px 11px 4px;}

    /* DETAIL VIEW */
    .breadcrumb a{color:var(--text-dim);text-decoration:none;cursor:pointer;}
    .breadcrumb a:hover{text-decoration:underline;}
    .breadcrumb strong{color:var(--text);font-weight:700;}
    .view-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:30px 34px;}
    .detail-head{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-bottom:8px;}
    .title-row{display:flex;align-items:center;gap:14px;}
    .title-row .page-title{font-size:24px;}
    .status-action-btns{display:flex;gap:8px;flex-wrap:wrap;}
    .status-action-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:20px;border:1px solid var(--border);background:#fff;font-size:12.5px;font-weight:700;color:var(--text-dim);cursor:pointer;font-family:inherit;}
    .status-action-btn:hover{background:#f4f6f5;color:var(--text);}
    .status-action-btn.danger-btn{color:var(--danger);border-color:#f0c9c6;}
    .status-action-btn.danger-btn:hover{background:var(--danger-light);}
    .detail-card{background:#fff;border:1px solid var(--border);border-radius:var(--radius-md);padding:22px 24px;margin-top:18px;}
    .detail-card h3{font-size:15px;font-weight:700;margin:0 0 16px;}
    .field-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 40px;}
    .detail-field label{display:block;font-size:11.5px;font-weight:700;letter-spacing:.06em;color:var(--text-dim);text-transform:uppercase;margin-bottom:5px;}
    .detail-field .value{font-size:15px;font-weight:600;color:var(--text);}
    .detail-field .value.onhand-lg{font-size:20px;font-weight:800;color:#2f7d4f;}
    .formula-note{font-size:11.5px;color:var(--text-dim);margin-top:16px;padding-top:14px;border-top:1px solid var(--border);}
    .meta-footer{display:flex;gap:28px;padding:16px 4px 0;font-size:12.5px;color:var(--text-dim);margin-top:8px;}
    .meta-footer b{color:var(--text);}

    /* MINI TABLE (linked logs) */
    .mini-table{width:100%;border-collapse:collapse;}
    .mini-table th{text-align:left;padding:11px 14px;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--text-dim);text-transform:uppercase;background:#fbfaf8;border-bottom:1px solid var(--border);}
    .mini-table td{padding:13px 14px;font-size:14px;border-bottom:1px solid var(--border);color:var(--text);}
    .mini-table tr:last-child td{border-bottom:none;}
    .mini-empty{text-align:center;color:var(--text-dim);font-style:italic;}

    /* TIMELINE */
    .timeline{display:flex;flex-direction:column;}
    .t-step{display:flex;gap:14px;padding-bottom:20px;}
    .t-step:last-child{padding-bottom:0;}
    .t-rail{position:relative;display:flex;flex-direction:column;align-items:center;}
    .t-dot{width:13px;height:13px;border-radius:50%;background:#2f7d4f;margin-top:3px;flex-shrink:0;z-index:1;}
    .t-step.pending .t-dot{background:var(--border);}
    .t-step.bad .t-dot{background:var(--danger);}
    .t-line{flex:1;width:2px;background:var(--border);margin-top:2px;}
    .t-step:last-child .t-line{display:none;}
    .t-title{font-size:13.5px;font-weight:700;}
    .t-step.pending .t-title{color:var(--text-dim);}
    .t-sub{font-size:12px;color:var(--text-dim);margin-top:2px;}

    /* IMMUTABLE NOTE */
    .immutable-note{display:flex;gap:10px;align-items:flex-start;background:#fbfaf8;border-radius:var(--radius-md);padding:14px 16px;font-size:13px;color:var(--text-dim);line-height:1.55;}
    .immutable-note svg{flex-shrink:0;margin-top:1px;}

    /* MODAL */
    .modal{max-height:92vh;overflow-y:auto;position:relative;padding:28px 32px;}
    .modal.modal-narrow{max-width:520px;}
    .modal h2{margin:0 0 4px;font-size:20px;}
    .modal-sub{color:var(--text-dim);font-size:13.5px;margin:0 0 18px;}
    .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 26px;margin-bottom:8px;}
    .field-full{grid-column:1 / -1;}
    .field label{display:block;font-size:13.5px;font-weight:700;margin-bottom:6px;}
    .field label .req{color:var(--danger);margin-left:2px;}
    .field input, .field select, .field textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:14px;font-family:inherit;background:#fff;color:var(--text);}
    .field input:disabled, .field select:disabled{background:#f4f6f5;color:var(--text-dim);cursor:not-allowed;}
    .field textarea{resize:vertical;}
    .field-hint{font-size:11.5px;color:var(--text-dim);margin-top:5px;}
    .modal-footer{display:flex;justify-content:flex-end;margin-top:20px;}
    .required-note{font-size:11.5px;color:var(--danger);margin-top:6px;}

    /* CURRENT STATUS / QTY PANEL */
    .current-status{display:flex;align-items:center;justify-content:space-between;gap:20px;background:#fbfaf8;border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 16px;margin-bottom:18px;}
    .cs-label{font-size:12px;color:var(--text-dim);}
    .cs-val{font-size:16px;font-weight:800;margin-top:2px;}

    /* STATUS RADIO OPTIONS */
    .status-options{display:flex;flex-direction:column;gap:8px;}
    .option{display:flex;align-items:center;gap:10px;padding:11px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);cursor:pointer;font-size:14px;transition:border-color .15s ease,background .15s ease;}
    .option:hover{border-color:#c7c4b6;background:#fbfaf8;}
    .option.selected{border-color:var(--accent);background:var(--accent-light);font-weight:700;}
    .option input{accent-color:var(--accent);}
    .empty-note{font-size:13px;color:var(--text-dim);font-style:italic;padding:8px 0;}

    /* TOGGLE (received/dispensed) */
    .toggle{display:flex;background:#f2f0ed;border-radius:10px;padding:4px;margin-bottom:18px;}
    .toggle-opt{flex:1;text-align:center;padding:9px 0;font-size:13px;font-weight:700;border-radius:8px;cursor:pointer;color:var(--text-dim);background:none;border:none;font-family:inherit;}
    .toggle-opt.active{background:#fff;color:var(--text);box-shadow:0 2px 6px rgba(30,16,8,.08);}

    /* ALERTS */
    .alert{padding:12px 16px;border-radius:var(--radius-sm);margin-bottom:18px;font-size:13.5px;font-weight:500;}
    .alert-error{background:var(--danger-light);color:var(--danger);border:1px solid #f5c2c0;}
    .alert-success{background:#e6f4ec;color:#2f7d4f;border:1px solid #c3e6d1;}
    .alert-info{background:var(--blue-light);color:#184b7a;border:1px solid #cfe0f0;}
  `]
})
export class SupplyChainComponent implements OnInit {
  private api = inject(ApiService);

  activeTab = signal<'shipments' | 'coldchain' | 'inventory'>('shipments');
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);
  infoMsg = signal<string | null>(null);
  saving = signal<boolean>(false);

  // detail view: { type, data }
  detail = signal<{ type: 'shipment' | 'inventory' | 'coldchain'; data: any } | null>(null);
  openMenu = signal<string | null>(null);

  // Data pools
  shipments = signal<any[]>([]);
  inventory = signal<any[]>([]);
  telemetry = signal<any[]>([]);
  batches = signal<any[]>([]);
  sites = signal<any[]>([]);
  products = signal<any[]>([]);

  carriers = ['DHL', 'FedEx', 'UPS', 'ColdChainExpress'];

  // Filters
  shipSearch = '';
  shipStatusFilter = 'All statuses';
  coldSearch = '';
  coldReadingFilter = 'All readings';
  invSearch = '';
  invSiteFilter = '';
  invBatchFilter = '';

  // Pagination
  shipPage = signal<number>(1);
  telPage = signal<number>(1);
  invPage = signal<number>(1);
  pageSize = 8;

  // Modals
  showShipmentModal = signal<boolean>(false);
  showStatusModal = signal<boolean>(false);
  showInventoryModal = signal<boolean>(false);
  showQtyModal = signal<boolean>(false);
  showReadingModal = signal<boolean>(false);
  shipmentEditing = false;

  shipmentForm: any = {};
  statusForm: any = {};
  inventoryForm: any = {};
  qtyForm: any = {};
  readingForm: any = {};

  ngOnInit() {
    this.fetchBatches();
    this.fetchSites();
    this.fetchProducts();
    this.fetchShipments();
    this.fetchInventory();
    this.fetchTelemetry();
  }

  @HostListener('document:click')
  onDocClick() { this.openMenu.set(null); }

  toggleMenu(id: string, ev: Event) {
    ev.stopPropagation();
    this.openMenu.set(this.openMenu() === id ? null : id);
  }

  // ── data fetch ──
  fetchShipments() {
    this.api.getShipments().subscribe({
      next: (res) => this.shipments.set(res?.data || []),
      error: () => this.shipments.set([])
    });
  }
  fetchInventory() {
    this.api.getInventory().subscribe({
      next: (res) => this.inventory.set(res?.data || []),
      error: () => this.inventory.set([])
    });
  }
  fetchTelemetry() {
    this.api.getColdChainLogs().subscribe({
      next: (res) => this.telemetry.set(res?.data || []),
      error: () => this.telemetry.set([])
    });
  }
  fetchBatches() {
    this.api.getBatches().subscribe({ next: (data) => this.batches.set(data || []), error: () => this.batches.set([]) });
  }
  fetchSites() {
    this.api.getSites().subscribe({ next: (res) => { if (res?.success) this.sites.set(res.data || []); }, error: () => this.sites.set([]) });
  }
  fetchProducts() {
    this.api.getProducts().subscribe({ next: (res) => { if (res?.success) this.products.set(res.data || []); }, error: () => this.products.set([]) });
  }

  // ── lookups ──
  getProductName(productId: any): string {
    const p = this.products().find(item => String(item.productId) === String(productId));
    return p ? p.productName : `Product ${productId}`;
  }
  getSiteName(siteId: any): string {
    const s = this.sites().find(item => String(item.siteId) === String(siteId));
    return s ? s.siteName : `Site ${siteId}`;
  }
  getBatchNumber(batchId: any): string {
    const b = this.batches().find(item => String(item.batchId) === String(batchId));
    return b ? b.batchNumber : `Batch ${batchId}`;
  }

  // ── formatting ──
  fmtShip(id: any): string { return id != null ? 'SHP-' + String(id).padStart(4, '0') : '—'; }
  fmtLog(id: any): string { return id != null ? 'CCL-' + String(id).padStart(4, '0') : '—'; }
  num(v: any): string {
    const n = Number(v);
    return isNaN(n) ? '0.00' : n.toFixed(2);
  }

  // ── shipment helpers ──
  shipBadge(status: string): string {
    switch (status) {
      case 'Dispatched': return 'badge-dispatched';
      case 'InTransit': return 'badge-transit';
      case 'Delivered': return 'badge-delivered';
      case 'Lost': return 'badge-lost';
      case 'Rejected': return 'badge-rejected';
      default: return 'badge-dispatched';
    }
  }
  countShipStatus(status: string): number {
    return this.shipments().filter(s => s.status === status).length;
  }
  filteredShipments() {
    const q = (this.shipSearch || '').toLowerCase();
    return this.shipments().filter(s => {
      const okS = this.shipStatusFilter === 'All statuses' || s.status === this.shipStatusFilter;
      const batchNum = s.batch?.batchNumber || this.getBatchNumber(s.batchId);
      const okQ = !q || ((s.carrierName || '') + ' ' + batchNum + ' ' + this.fmtShip(s.shipmentId)).toLowerCase().includes(q);
      return okS && okQ;
    });
  }
  shipTotalPages() { return Math.max(1, Math.ceil(this.filteredShipments().length / this.pageSize)); }
  pagedShipments() {
    const start = (this.shipPage() - 1) * this.pageSize;
    return this.filteredShipments().slice(start, start + this.pageSize);
  }

  // ── cold chain helpers ──
  isExcursion(log: any): boolean {
    if (log?.status) return String(log.status).toLowerCase() === 'excursion';
    if (log?.excursionFlag != null) return !!log.excursionFlag;
    const t = Number(log?.temperature), lo = Number(log?.minThreshold), hi = Number(log?.maxThreshold);
    return t < lo || t > hi;
  }
  filteredTelemetry() {
    const q = (this.coldSearch || '').toLowerCase();
    return this.telemetry().filter(log => {
      const sid = log.shipmentId || log.shipment?.shipmentId;
      const okR = this.coldReadingFilter === 'All readings' || (this.coldReadingFilter === 'Excursions only' && this.isExcursion(log));
      const okQ = !q || (this.fmtShip(sid) + ' ' + String(sid)).toLowerCase().includes(q);
      return okR && okQ;
    });
  }
  telTotalPages() { return Math.max(1, Math.ceil(this.filteredTelemetry().length / this.pageSize)); }
  pagedTelemetry() {
    const start = (this.telPage() - 1) * this.pageSize;
    return this.filteredTelemetry().slice(start, start + this.pageSize);
  }
  logsForShipment(shipmentId: any) {
    return this.telemetry().filter(log => String(log.shipmentId || log.shipment?.shipmentId) === String(shipmentId));
  }

  // ── inventory helpers ──
  onHand(inv: any): number {
    if (inv?.quantityOnHand != null) return Number(inv.quantityOnHand);
    return Number(inv?.quantityReceived || 0) - Number(inv?.quantityDispensed || 0);
  }
  isLow(inv: any): boolean {
    const oh = this.onHand(inv);
    const rcv = Number(inv?.quantityReceived || 0);
    return oh > 0 && rcv > 0 && oh < rcv * 0.1;
  }
  filteredInventory() {
    const q = (this.invSearch || '').toLowerCase();
    return this.inventory().filter(inv => {
      const okSite = !this.invSiteFilter || String(inv.siteId) === String(this.invSiteFilter);
      const okBatch = !this.invBatchFilter || String(inv.batchId) === String(this.invBatchFilter);
      const okQ = !q || (this.getSiteName(inv.siteId) + ' ' + this.getBatchNumber(inv.batchId)).toLowerCase().includes(q);
      return okSite && okBatch && okQ;
    });
  }
  invTotalPages() { return Math.max(1, Math.ceil(this.filteredInventory().length / this.pageSize)); }
  pagedInventory() {
    const start = (this.invPage() - 1) * this.pageSize;
    return this.filteredInventory().slice(start, start + this.pageSize);
  }

  // ── detail navigation ──
  viewShipment(s: any) { this.openMenu.set(null); this.detail.set({ type: 'shipment', data: s }); this.clearMsg(); }
  viewInventory(inv: any) { this.openMenu.set(null); this.detail.set({ type: 'inventory', data: inv }); this.clearMsg(); }
  viewReading(log: any) { this.openMenu.set(null); this.detail.set({ type: 'coldchain', data: log }); this.clearMsg(); }
  closeDetail() { this.detail.set(null); this.clearMsg(); }
  backToTab(tab: 'shipments' | 'coldchain' | 'inventory') { this.detail.set(null); this.activeTab.set(tab); this.clearMsg(); }
  viewColdChainLogs(s: any) {
    this.openMenu.set(null);
    this.detail.set(null);
    this.activeTab.set('coldchain');
    this.coldSearch = String(s.shipmentId);
    this.telPage.set(1);
  }

  custody(s: any): any[] {
    const status = s.status;
    const dispatched = { title: 'Dispatched', sub: this.getSiteName(s.fromSiteId || s.fromSite?.siteId) + ' · ' + (s.shipmentDate || ''), pending: false, bad: false };
    const transit = { title: 'In Transit', sub: s.carrierName || '', pending: status === 'Dispatched', bad: false };
    let last;
    if (status === 'Lost') last = { title: 'Lost', sub: 'Shipment reported lost', pending: false, bad: true };
    else if (status === 'Rejected') last = { title: 'Rejected', sub: 'Shipment rejected on arrival', pending: false, bad: true };
    else last = { title: 'Delivered', sub: status === 'Delivered' ? ('Arrived at ' + this.getSiteName(s.toSiteId || s.toSite?.siteId)) : ('Pending arrival at ' + this.getSiteName(s.toSiteId || s.toSite?.siteId)), pending: status !== 'Delivered', bad: false };
    return [dispatched, transit, last];
  }

  // ── create / edit shipment ──
  openCreateShipment() {
    this.shipmentEditing = false;
    this.shipmentForm = {
      shipmentId: null,
      batchId: this.batches()[0]?.batchId ?? '',
      fromSiteId: this.sites()[0]?.siteId ?? '',
      toSiteId: this.sites()[1]?.siteId ?? this.sites()[0]?.siteId ?? '',
      shipmentDate: this.today(),
      quantityShipped: 100,
      unit: 'Vials',
      carrierName: ''
    };
    this.clearMsg();
    this.showShipmentModal.set(true);
  }
  openEditShipment(s: any) {
    this.openMenu.set(null);
    this.shipmentEditing = true;
    this.shipmentForm = {
      shipmentId: s.shipmentId,
      batchId: s.batch?.batchId ?? s.batchId,
      fromSiteId: s.fromSite?.siteId ?? s.fromSiteId,
      toSiteId: s.toSite?.siteId ?? s.toSiteId,
      shipmentDate: s.shipmentDate,
      quantityShipped: s.quantityShipped,
      unit: s.unit,
      carrierName: s.carrierName
    };
    this.clearMsg();
    this.showShipmentModal.set(true);
  }
  saveShipment() {
    if (!this.shipmentForm.batchId || !this.shipmentForm.fromSiteId || !this.shipmentForm.toSiteId || !this.shipmentForm.carrierName) {
      this.showError('Batch, sites and carrier are required.');
      return;
    }
    this.saving.set(true);
    const payload = {
      batchId: parseInt(this.shipmentForm.batchId, 10),
      fromSiteId: parseInt(this.shipmentForm.fromSiteId, 10),
      toSiteId: parseInt(this.shipmentForm.toSiteId, 10),
      shipmentDate: this.shipmentForm.shipmentDate,
      quantityShipped: this.shipmentForm.quantityShipped,
      unit: this.shipmentForm.unit,
      carrierName: this.shipmentForm.carrierName
    };
    const req = this.shipmentEditing
      ? this.api.updateShipment(this.shipmentForm.shipmentId, payload)
      : this.api.createShipment(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showShipmentModal.set(false);
        this.showSuccess(this.shipmentEditing ? 'Shipment updated successfully.' : 'Shipment registered in Dispatched state.');
        this.fetchShipments();
        if (this.detail()?.type === 'shipment') this.closeDetail();
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || 'Failed to save shipment.'); }
    });
  }

  // ── update status ──
  openUpdateStatus(s: any) {
    this.openMenu.set(null);
    this.statusForm = {
      shipmentId: s.shipmentId,
      currentStatus: s.status,
      batchNumber: s.batch?.batchNumber || this.getBatchNumber(s.batchId),
      route: (s.fromSite?.siteName || this.getSiteName(s.fromSiteId)) + ' → ' + (s.toSite?.siteName || this.getSiteName(s.toSiteId)),
      newStatus: '',
      reason: ''
    };
    this.clearMsg();
    this.showStatusModal.set(true);
  }
  statusOptions(): string[] {
    switch (this.statusForm.currentStatus) {
      case 'Dispatched': return ['InTransit'];
      case 'InTransit': return ['Delivered', 'Lost', 'Rejected'];
      default: return [];
    }
  }
  saveStatus() {
    if (!this.statusForm.newStatus) { this.showError('Select a new status.'); return; }
    if ((this.statusForm.newStatus === 'Lost' || this.statusForm.newStatus === 'Rejected') && !this.statusForm.reason?.trim()) {
      this.showError('A reason is required when marking a shipment Lost or Rejected.');
      return;
    }
    this.saving.set(true);
    this.api.updateShipmentStatus(this.statusForm.shipmentId, this.statusForm.newStatus).subscribe({
      next: () => {
        this.saving.set(false);
        this.showStatusModal.set(false);
        this.showSuccess('Shipment status updated to ' + this.statusForm.newStatus + '.');
        this.fetchShipments();
        if (this.detail()?.type === 'shipment') this.closeDetail();
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || 'Failed to update shipment status.'); }
    });
  }

  // ── create inventory ──
  openCreateInventory() {
    this.inventoryForm = {
      siteId: this.sites()[0]?.siteId ?? '',
      batchId: this.batches()[0]?.batchId ?? '',
      quantityReceived: 500,
      quantityDispensed: 0,
      storageCondition: 'Refrigerated 2–8°C'
    };
    this.clearMsg();
    this.showInventoryModal.set(true);
  }
  saveInventory() {
    if (!this.inventoryForm.siteId || !this.inventoryForm.batchId) { this.showError('Site and batch are required.'); return; }
    this.saving.set(true);
    const payload = {
      siteId: parseInt(this.inventoryForm.siteId, 10),
      batchId: parseInt(this.inventoryForm.batchId, 10),
      quantityReceived: this.inventoryForm.quantityReceived,
      quantityDispensed: this.inventoryForm.quantityDispensed,
      storageCondition: this.inventoryForm.storageCondition
    };
    this.api.createInventory(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showInventoryModal.set(false);
        this.showSuccess('Inventory log compiled successfully.');
        this.fetchInventory();
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || 'Failed to create inventory log.'); }
    });
  }

  // ── update quantity ──
  openUpdateQty(inv: any, mode: 'received' | 'dispensed') {
    this.openMenu.set(null);
    this.qtyForm = {
      inventoryId: inv.inventoryId,
      siteId: inv.siteId,
      batchId: inv.batchId,
      mode,
      currentReceived: Number(inv.quantityReceived || 0),
      currentDispensed: Number(inv.quantityDispensed || 0),
      storageCondition: inv.storageCondition,
      amount: null
    };
    this.clearMsg();
    this.showQtyModal.set(true);
  }
  saveQty() {
    const amt = Number(this.qtyForm.amount);
    if (!amt || amt <= 0) { this.showError('Enter an amount greater than zero.'); return; }
    this.saving.set(true);
    const payload: any = {
      siteId: this.qtyForm.siteId,
      batchId: this.qtyForm.batchId,
      quantityReceived: this.qtyForm.mode === 'received' ? amt : 0,
      quantityDispensed: this.qtyForm.mode === 'dispensed' ? amt : 0,
      storageCondition: this.qtyForm.storageCondition
    };
    const req = this.qtyForm.mode === 'received'
      ? this.api.updateReceivedQuantity(this.qtyForm.inventoryId, payload)
      : this.api.updateDispensedQuantity(this.qtyForm.inventoryId, payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.showQtyModal.set(false);
        this.showSuccess('Inventory quantity balance updated successfully.');
        this.fetchInventory();
        if (this.detail()?.type === 'inventory') this.closeDetail();
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || 'Failed to update inventory balance.'); }
    });
  }

  // ── record reading ──
  openRecordReading() {
    this.readingForm = {
      shipmentId: this.shipments()[0]?.shipmentId ?? '',
      recordedAt: new Date().toISOString().substring(0, 16),
      temperature: 5.0,
      minThreshold: 2.0,
      maxThreshold: 8.0
    };
    this.clearMsg();
    this.showReadingModal.set(true);
  }
  saveReading() {
    if (!this.readingForm.shipmentId) { this.showError('Select a shipment.'); return; }
    this.saving.set(true);
    const payload = {
      shipmentId: parseInt(this.readingForm.shipmentId, 10),
      recordedAt: this.readingForm.recordedAt + ':00',
      temperature: this.readingForm.temperature,
      minThreshold: this.readingForm.minThreshold,
      maxThreshold: this.readingForm.maxThreshold
    };
    this.api.recordTemperatureLog(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.showReadingModal.set(false);
        this.showSuccess('Temperature log recorded successfully.');
        this.fetchTelemetry();
      },
      error: (err) => { this.saving.set(false); this.showError(err?.error?.message || 'Failed to record sensor log.'); }
    });
  }

  // ── messages ──
  private today(): string { return new Date().toISOString().substring(0, 10); }
  showSuccess(m: string) { this.successMsg.set(m); this.errorMsg.set(null); this.infoMsg.set(null); setTimeout(() => this.successMsg.set(null), 4000); }
  showError(m: string) { this.errorMsg.set(m); this.successMsg.set(null); this.infoMsg.set(null); setTimeout(() => this.errorMsg.set(null), 5000); }
  clearMsg() { this.errorMsg.set(null); this.successMsg.set(null); this.infoMsg.set(null); }
}
