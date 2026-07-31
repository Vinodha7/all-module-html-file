import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-signatures-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <div class="page-head">
        <div>
          <h1 class="page-title">Electronic Signatures</h1>
          <div class="page-sub">Unalterable electronic signature logs for 21 CFR Part 11 compliance.</div>
        </div>
        <div class="actions-row">
          <div class="dropdown">
            <button type="button" class="btn btn-outline" (click)="exportMenuOpen.set(!exportMenuOpen())" aria-label="Export options">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div class="dropdown-menu dropdown-menu-right" [class.open]="exportMenuOpen()">
              <button type="button" class="dropdown-item" (click)="exportSignatures('pdf'); exportMenuOpen.set(false)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
                Export as PDF
              </button>
              <button type="button" class="dropdown-item" (click)="exportSignatures('excel'); exportMenuOpen.set(false)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
                Export as Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <div class="info-banner">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div><strong>View only.</strong> Administrators can monitor signature status across every signed record but cannot sign, approve, or reject on behalf of any user.</div>
      </div>

      <!-- Filters -->
      <div class="filter-row">
        <select class="select" [(ngModel)]="entityFilter" (change)="applyFilters()">
          <option value="All">All modules</option>
          <option value="TrialProtocol">Clinical Trials (TrialProtocol)</option>
          <option value="TrialSubject">Subject Enrollment (TrialSubject)</option>
          <option value="BatchRecord">Batch Manufacturing (BatchRecord)</option>
          <option value="CAPARecord">Deviation & CAPA (CAPARecord)</option>
          <option value="RegulatoryDossier">Regulatory Affairs (RegulatoryDossier)</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-card">
        <div class="table-card-head">
          <h3>Signature Records <span class="count">· {{ filteredSignatures().length }} total</span></h3>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <colgroup>
              <col style="width:24%">
              <col style="width:10%">
              <col style="width:22%">
              <col style="width:15%">
              <col style="width:19%">
              <col style="width:90px">
            </colgroup>
            <thead>
              <tr>
                <th>Entity</th>
                <th>Version</th>
                <th>Signer</th>
                <th>Meaning</th>
                <th>Date Signed</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let sig of paginatedSignatures()">
                <td>
                  <div class="name-cell">{{ sig.entityType }}</div>
                  <div class="ref-code">{{ sig.entityId }}</div>
                </td>
                <td>v{{ sig.entityVersion }}</td>
                <td>
                  <div>{{ sig.signerName }}</div>
                  <div class="ref-code">ID: {{ sig.signerId }}</div>
                </td>
                <td>
                  <span class="badge-status"
                        [class.badge-approved]="sig.meaning === 'APPROVED'"
                        [class.badge-submitted]="sig.meaning === 'REVIEWED'"
                        [class.badge-progress]="sig.meaning === 'RELEASED'">
                    {{ sig.meaning }}
                  </span>
                </td>
                <td>{{ sig.signedAt | date:'medium' }}</td>
                <td>
                  <button type="button" class="icon-menu-btn" title="View signature details" (click)="viewDetails(sig)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </td>
              </tr>
              <tr *ngIf="filteredSignatures().length === 0">
                <td colspan="6" class="empty-state">No electronic signatures found matching criteria.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="filteredSignatures().length > 0">
          <div>Page {{ page() }} of {{ totalPages() }} · {{ filteredSignatures().length }} records</div>
          <div class="pager">
            <button type="button" [disabled]="page() === 1" (click)="page.set(page() - 1)" title="Previous page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <span style="padding:0 4px;">{{ page() }} / {{ totalPages() }}</span>
            <button type="button" [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" title="Next page">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- VIEW SIGNATURE DETAILS MODAL (NO SIGNATURE METHOD FIELD) -->
      <div class="modal-overlay" *ngIf="selectedSignature()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="selectedSignature.set(null)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Signature Details</h2>

          <div class="detail-grid">
            <div class="detail-field">
              <label>Signature ID</label>
              <div class="value mono">{{ selectedSignature().signatureId }}</div>
            </div>
            <div class="detail-field">
              <label>Meaning</label>
              <span class="badge-status"
                    [class.badge-approved]="selectedSignature().meaning === 'APPROVED'"
                    [class.badge-submitted]="selectedSignature().meaning === 'REVIEWED'"
                    [class.badge-progress]="selectedSignature().meaning === 'RELEASED'">
                {{ selectedSignature().meaning }}
              </span>
            </div>
            <div class="detail-field">
              <label>Entity Type</label>
              <div class="value">{{ selectedSignature().entityType }}</div>
            </div>
            <div class="detail-field">
              <label>Business Record ID</label>
              <div class="value">{{ selectedSignature().entityId }}</div>
            </div>
            <div class="detail-field">
              <label>Version</label>
              <div class="value">v{{ selectedSignature().entityVersion }}</div>
            </div>
            <div class="detail-field">
              <label>Signer Name</label>
              <div class="value">{{ selectedSignature().signerName }}</div>
            </div>
            <div class="detail-field">
              <label>Signed At</label>
              <div class="value">{{ selectedSignature().signedAt | date:'medium' }}</div>
            </div>
            <div class="detail-field detail-field-full">
              <label>Tamper-Evident SHA-256 Checksum</label>
              <div class="value mono hash-value">{{ selectedSignature().signatureHash }}</div>
            </div>
          </div>

          <div class="info-banner" style="margin-top:20px;margin-bottom:0;">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>
            <div>This signature was verified against the record payload and cannot be altered by administrators.</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .filter-row .select { min-width: 240px; }
    .detail-field-full { grid-column: 1 / -1; }
    .hash-value { word-break: break-all; font-size: 13.5px; font-weight: 500; }
    .empty-state {
      text-align: center;
      color: var(--text-dim);
      font-style: italic;
      padding: 28px !important;
    }
    .pager button:disabled { opacity: 0.45; cursor: not-allowed; }
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
  `]
})
export class SignaturesComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  signatures = signal<any[]>([]);
  filteredSignatures = signal<any[]>([]);

  // Filters
  entityFilter = 'All';

  // Pagination states
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  selectedSignature = signal<any>(null);

  // Export menu toggle
  exportMenuOpen = signal<boolean>(false);

  ngOnInit() {
    this.fetchSignatures();
  }

  fetchSignatures() {
    this.apiService.getAllSignatures().subscribe({
      next: (res) => {
        if (res.success) {
          this.signatures.set(res.data || []);
          this.applyFilters();
        }
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching signatures log.')
    });
  }

  applyFilters() {
    let result = [...this.signatures()];
    if (this.entityFilter !== 'All') {
      result = result.filter(s => s.entityType === this.entityFilter);
    }

    this.filteredSignatures.set(result);
    this.page.set(1);
    this.totalPages.set(Math.ceil(result.length / this.pageSize) || 1);
  }

  paginatedSignatures() {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredSignatures().slice(start, start + this.pageSize);
  }

  viewDetails(sig: any) {
    this.selectedSignature.set(sig);
  }

  // ── EXPORT SIGNATURES (PDF / EXCEL CLIENT INTEGRATION) ──
  exportSignatures(format: 'pdf' | 'excel') {
    const list = this.filteredSignatures().map(s => ({
      'Signature ID': s.signatureId,
      'Entity Type': s.entityType,
      'Record ID': s.entityId,
      'Version': s.entityVersion,
      'Signer': s.signerName,
      'Meaning': s.meaning,
      'Date Signed': s.signedAt,
      'SHA-256 Hash': s.signatureHash
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(list);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Signatures');
      XLSX.writeFile(wb, 'PharmaTrack_Signatures_AuditLog.xlsx');
      this.showSuccess('Signatures exported to Excel successfully.');
    } else {
      const doc = new jsPDF('landscape');
      doc.text('PharmaTrack — Electronic Signatures Manifest Log (21 CFR Part 11)', 14, 15);
      
      const headers = [['ID', 'Entity Type', 'Record ID', 'Ver.', 'Signer', 'Meaning', 'Date Signed', 'SHA-256 Checksum']];
      const rows = list.map(s => [
        s['Signature ID'], 
        s['Entity Type'], 
        s['Record ID'], 
        'v' + s['Version'], 
        s['Signer'], 
        s['Meaning'], 
        s['Date Signed'], 
        s['SHA-256 Hash'].substring(0, 20) + '...'
      ]);

      (doc as any).autoTable({
        head: headers,
        body: rows,
        startY: 22,
        theme: 'striped',
        headStyles: { fillColor: [206, 82, 0] } // Theme primary CE5200
      });
      doc.save('PharmaTrack_Signatures.pdf');
      this.showSuccess('Signatures exported to PDF successfully.');
    }
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
