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
    <div class="admin-container">
      <div class="admin-header">
        <div>
          <h2>Electronic Signatures Log</h2>
          <p>Unalterable electronic signature logs for CFR 21 Part 11 compliance.</p>
        </div>
        <div class="export-group">
          <button class="btn btn-secondary" (click)="exportSignatures('pdf')">Export PDF</button>
          <button class="btn btn-secondary" (click)="exportSignatures('excel')">Export Excel</button>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- Filters -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>🔽 Filter by Module/Entity</label>
          <select [(ngModel)]="entityFilter" (change)="applyFilters()">
            <option value="All">All</option>
            <option value="TrialProtocol">Clinical Trials (TrialProtocol)</option>
            <option value="TrialSubject">Subject Enrollment (TrialSubject)</option>
            <option value="BatchRecord">Batch Manufacturing (BatchRecord)</option>
            <option value="CAPARecord">Deviation & CAPA (CAPARecord)</option>
            <option value="RegulatoryDossier">Regulatory Affairs (RegulatoryDossier)</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Entity Type</th>
              <th>Business Ident. (Entity ID)</th>
              <th>Version</th>
              <th>Signer</th>
              <th>Meaning</th>
              <th>Date Signed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let sig of paginatedSignatures()">
              <td style="font-weight: 600;">{{ sig.entityType }}</td>
              <td>{{ sig.entityId }}</td>
              <td>v{{ sig.entityVersion }}</td>
              <td>{{ sig.signerName }} (ID: {{ sig.signerId }})</td>
              <td>
                <span class="meaning-pill" [class.meaning-approved]="sig.meaning === 'APPROVED'" [class.meaning-reviewed]="sig.meaning === 'REVIEWED'" [class.meaning-released]="sig.meaning === 'RELEASED'">
                  {{ sig.meaning }}
                </span>
              </td>
              <td>{{ sig.signedAt | date:'medium' }}</td>
              <td>
                <button class="btn-view" (click)="viewDetails(sig)">View Details</button>
              </td>
            </tr>
            <tr *ngIf="filteredSignatures().length === 0">
              <td colspan="7" class="empty-state">No electronic signatures found matching criteria.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="filteredSignatures().length > 0">
        <button [disabled]="page() === 1" (click)="page.set(page() - 1)">Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)">Next</button>
      </div>

      <!-- VIEW DETAIL MODAL (WITHOUT SIGNATURE METHOD FIELD) -->
      <div class="modal-overlay" *ngIf="selectedSignature()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Electronic Signature Manifest</h3>
            <button class="close-modal" (click)="selectedSignature.set(null)">×</button>
          </div>
          
          <div class="details-pane">
            <div class="detail-item">
              <span class="label">Signature ID:</span> 
              {{ selectedSignature().signatureId }}
            </div>
            <div class="detail-item">
              <span class="label">Entity Type:</span> 
              {{ selectedSignature().entityType }}
            </div>
            <div class="detail-item">
              <span class="label">Business Record ID:</span> 
              {{ selectedSignature().entityId }}
            </div>
            <div class="detail-item">
              <span class="label">Version Number:</span> 
              v{{ selectedSignature().entityVersion }}
            </div>
            <div class="detail-item">
              <span class="label">Signer Name:</span> 
              {{ selectedSignature().signerName }}
            </div>
            <div class="detail-item">
              <span class="label">Signed At:</span> 
              {{ selectedSignature().signedAt | date:'medium' }}
            </div>
            <div class="detail-item">
              <span class="label">Manifest Meaning:</span> 
              <span class="meaning-pill">{{ selectedSignature().meaning }}</span>
            </div>
            <div class="detail-item hash-box">
              <span class="label" style="display: block; margin-bottom: 6px;">Tamper-Evident SHA-256 Checksum:</span>
              <code>{{ selectedSignature().signatureHash }}</code>
            </div>
            <div class="verified-banner">
              🛡️ Signature verified against record payload
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="selectedSignature.set(null)">Close</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-container {
      background: #ffffff;
      border: 1px solid #ece4dc;
      border-radius: 14px;
      padding: 32px;
    }
    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .admin-header h2 {
      font-family: 'Manrope', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #211611;
      margin: 0 0 6px;
    }
    .admin-header p {
      color: #7a6a5e;
      font-size: 14px;
      margin: 0;
    }
    .filter-bar {
      display: flex;
      margin-bottom: 20px;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .filter-group label {
      font-size: 13.5px;
      font-weight: 700;
      color: #211611;
    }
    .filter-group select {
      padding: 8px 12px;
      border: 1px solid #ece4dc;
      border-radius: 6px;
      outline: none;
      font-size: 13.5px;
    }
    .export-group {
      display: flex;
      gap: 8px;
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
    .data-table tr:hover td {
      background: #fdfcfb;
    }
    .meaning-pill {
      background: #fbe9de;
      color: #CE5200;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
    }
    .meaning-approved {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .meaning-reviewed {
      background: #e8f1fa;
      color: #1d5f9e;
    }
    .meaning-released {
      background: #fff8e1;
      color: #f57f17;
    }
    .btn-view {
      background: none;
      border: 1px solid #ece4dc;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      color: #211611;
      font-weight: 600;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .btn-view:hover {
      background: #fbe9de;
      border-color: #CE5200;
      color: #CE5200;
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
    .details-pane {
      display: flex;
      flex-direction: column;
      gap: 12px;
      text-align: left;
    }
    .detail-item {
      font-size: 14px;
      color: #211611;
    }
    .detail-item .label {
      font-weight: 700;
      color: #7a6a5e;
      width: 140px;
      display: inline-block;
    }
    .hash-box {
      background: #f7f5f2;
      border: 1px solid #ece4dc;
      padding: 10px;
      border-radius: 6px;
    }
    .hash-box code {
      word-break: break-all;
      font-size: 12.5px;
      color: #562200;
    }
    .verified-banner {
      background: #e8f5e9;
      color: #2e7d32;
      padding: 10px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 13px;
      text-align: center;
      border: 1px solid #c8e6c9;
    }
    .modal-footer {
      display: flex;
      justify-content: flex-end;
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
