import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-regulatory-affairs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ══════════ MASTER VIEW: Dossiers Registry ══════════ -->
    <div *ngIf="!selectedDossier()">
      <div class="page-head">
        <div>
          <h1 class="page-title">Regulatory Dossiers</h1>
          <div class="page-sub">Compile drug dossier submissions, schedule milestones, and transition approval workflow states.</div>
        </div>
        <button class="btn btn-primary btn-create" (click)="openCreateDossierModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          Create Dossier
        </button>
      </div>

      <div class="info-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div><strong>Approval workflow:</strong> Draft &rarr; Submitted &rarr; Under Review &rarr; Approved / Rejected. A Submitted dossier may also be Withdrawn. Approval is electronic-signature gated.</div>
      </div>

      <div class="filter-row">
        <div class="input-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input #searchInput type="text" placeholder="Search dossier, product or market">
        </div>
        <div class="filter-select">
          <svg class="funnel" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select #statusSel aria-label="Filter by Status">
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Withdrawn">Withdrawn</option>
          </select>
          <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      <div class="table-card">
        <div class="table-card-head">
          <h3>All Dossiers <span class="count">&middot; {{ dossiers().length }} total</span></h3>
        </div>
        <div class="table-scroll">
          <table class="table-fixed">
            <thead>
              <tr>
                <th>Dossier Code</th>
                <th>Target Product</th>
                <th>Submission Type</th>
                <th>Target Market</th>
                <th>Assigned Officer</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <ng-container *ngFor="let dos of paginatedDossiers()">
                <tr *ngIf="(statusSel.value === 'All' || dos.status === statusSel.value || (statusSel.value === 'Under Review' && (dos.status === 'UnderReview' || dos.status === 'Under Review'))) && (!searchInput.value || (((dos.dossierId || '') + ' ' + getProductName(dos.productId) + ' ' + (dos.targetMarket || '')).toLowerCase().includes(searchInput.value.toLowerCase())))">
                  <td><span class="name-cell code-strong">{{ dos.dossierId }}</span></td>
                  <td>{{ getProductName(dos.productId) }}</td>
                  <td><span class="tag">{{ dos.submissionType }}</span></td>
                  <td>{{ dos.targetMarket }}</td>
                  <td class="mono">Officer ID: {{ dos.assignedOfficerId }}</td>
                  <td>{{ dos.submissionDate }}</td>
                  <td>
                    <span class="badge-status"
                      [class.badge-draft]="dos.status === 'Draft' || dos.status === 'Withdrawn'"
                      [class.badge-submitted]="dos.status === 'Submitted'"
                      [class.badge-progress]="dos.status === 'Under Review' || dos.status === 'UnderReview'"
                      [class.badge-approved]="dos.status === 'Approved'"
                      [class.badge-rejected]="dos.status === 'Rejected'">
                      {{ dos.status }}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-secondary btn-sm" (click)="viewDossierDetails(dos)">View</button>
                  </td>
                </tr>
              </ng-container>
              <tr *ngIf="dossiers().length === 0">
                <td colspan="8">
                  <div class="empty-state">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                    <strong>No dossiers yet</strong>
                    Compile your first regulatory dossier to get started.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="table-footer" *ngIf="dossiers().length > 0">
          <div>Page {{ page() }} of {{ totalPages() }}</div>
          <div class="pager">
            <button [disabled]="page() === 1" (click)="page.set(page() - 1)" aria-label="Previous page">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button [disabled]="page() === totalPages()" (click)="page.set(page() + 1)" aria-label="Next page">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ DETAIL VIEW: Tabs on same page ══════════ -->
    <div *ngIf="selectedDossier()">
      <div class="breadcrumb">
        <a (click)="selectedDossier.set(null)">Dossiers</a> / <strong>{{ selectedDossier().dossierId }}</strong>
      </div>

      <div class="view-card">
        <div class="detail-top">
          <div>
            <h1 class="page-title">Dossier {{ selectedDossier().dossierId }}</h1>
            <div class="page-sub">{{ selectedDossier().submissionType }} submission &middot; {{ getProductName(selectedDossier().productId) }}</div>
          </div>
          <button class="btn btn-secondary btn-sm" (click)="selectedDossier.set(null)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back to Registry
          </button>
        </div>

        <div class="status-row">
          <div class="detail-field">
            <label>Status</label>
            <span class="badge-status"
              [class.badge-draft]="selectedDossier().status === 'Draft' || selectedDossier().status === 'Withdrawn'"
              [class.badge-submitted]="selectedDossier().status === 'Submitted'"
              [class.badge-progress]="selectedDossier().status === 'Under Review' || selectedDossier().status === 'UnderReview'"
              [class.badge-approved]="selectedDossier().status === 'Approved'"
              [class.badge-rejected]="selectedDossier().status === 'Rejected'">
              {{ selectedDossier().status }}
            </span>
          </div>
          <div class="detail-field"><label>Target Market</label><div class="value">{{ selectedDossier().targetMarket }}</div></div>
          <div class="detail-field"><label>Submission Date</label><div class="value">{{ selectedDossier().submissionDate }}</div></div>

          <!-- Workflow Controls -->
          <div class="status-action-btns">
            <button class="btn btn-primary btn-sm" *ngIf="selectedDossier().status === 'Draft'" (click)="transitionStateDirect('Submitted')">
              Submit Dossier
            </button>

            <div class="workflow-group" *ngIf="selectedDossier().status === 'Submitted'">
              <label>Transition</label>
              <select class="workflow-select" (change)="onStatusChangeSelect($event)">
                <option value="">-- Choose Status --</option>
                <option value="UnderReview">Under Review</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </div>

            <div class="workflow-group" *ngIf="selectedDossier().status === 'UnderReview' || selectedDossier().status === 'Under Review'">
              <label>Verdict</label>
              <select class="workflow-select" (change)="onStatusChangeSelect($event)">
                <option value="">-- Choose Verdict --</option>
                <option value="Approved">Approved (Signature-Gated)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Inline Tabs -->
        <div class="detail-tabs">
          <button [class.active]="detailTab() === 'dossier'" (click)="detailTab.set('dossier')">Dossier</button>
          <button [class.active]="detailTab() === 'milestones'" (click)="detailTab.set('milestones')">Milestones</button>
          <button [class.active]="detailTab() === 'history'" (click)="detailTab.set('history')">Submission History</button>
        </div>

        <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
        <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

        <!-- Dossier Details Tab -->
        <div *ngIf="detailTab() === 'dossier'" class="detail-grid">
          <div class="detail-field"><label>Dossier Code</label><div class="value">{{ selectedDossier().dossierId }}</div></div>
          <div class="detail-field"><label>Product Name</label><div class="value">{{ getProductName(selectedDossier().productId) }}</div></div>
          <div class="detail-field"><label>Submission Type</label><div class="value">{{ selectedDossier().submissionType }}</div></div>
          <div class="detail-field"><label>Target Market Region</label><div class="value">{{ selectedDossier().targetMarket }}</div></div>
          <div class="detail-field"><label>Submission Date</label><div class="value">{{ selectedDossier().submissionDate }}</div></div>
          <div class="detail-field"><label>Assigned Regulatory Officer</label><div class="value">Officer ID: {{ selectedDossier().assignedOfficerId }}</div></div>
        </div>

        <!-- Milestones Tab -->
        <div *ngIf="detailTab() === 'milestones'">
          <div class="section-head">
            <h3>Milestones Timeline</h3>
            <button class="btn btn-primary btn-sm" (click)="openCreateMilestoneModal()" [disabled]="selectedDossier().status === 'Approved' || selectedDossier().status === 'Rejected'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Milestone
            </button>
          </div>

          <div class="timeline" *ngIf="milestones().length > 0">
            <div class="timeline-item" *ngFor="let m of milestones()" [class.done]="m.status === 'Completed'">
              <span class="timeline-dot"></span>
              <div class="timeline-card">
                <div class="timeline-card-head">
                  <div class="timeline-title">{{ m.milestoneType }} <span class="ref-code">{{ m.milestoneId }}</span></div>
                  <span class="badge-status" [class.badge-approved]="m.status === 'Completed'" [class.badge-draft]="m.status !== 'Completed'">{{ m.status }}</span>
                </div>
                <div class="timeline-date">Scheduled: {{ m.milestoneDate }}</div>
                <div class="timeline-notes">{{ m.notes }}</div>
              </div>
            </div>
          </div>

          <div class="empty-state" *ngIf="milestones().length === 0">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <strong>No milestones scheduled</strong>
            No milestones scheduled for this dossier profile yet.
          </div>
        </div>

        <!-- Submission History Tab -->
        <div *ngIf="detailTab() === 'history'">
          <div class="section-head">
            <h3>Electronic Signature Audit Trail</h3>
          </div>
          <div class="section-box">
            <table class="mini-table">
              <thead>
                <tr>
                  <th>Signer Name</th>
                  <th>Meaning</th>
                  <th>Ver.</th>
                  <th>Signed At</th>
                  <th>SHA-256 Checksum Hash</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of signatureHistory()">
                  <td class="name-cell">{{ s.signerName }}</td>
                  <td><span class="tag">{{ s.meaning }}</span></td>
                  <td>v{{ s.entityVersion }}</td>
                  <td>{{ s.signedAt | date:'medium' }}</td>
                  <td class="hash-cell" [title]="s.signatureHash">{{ s.signatureHash }}</td>
                </tr>
                <tr *ngIf="signatureHistory().length === 0">
                  <td colspan="5">
                    <div class="empty-state">
                      <strong>No signatures registered</strong>
                      No electronic signatures registered for this dossier.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════ MODALS ══════════ -->

    <!-- 1. CREATE DOSSIER MODAL -->
    <div class="modal-overlay" *ngIf="showCreateDossierModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="confirmDiscard() && showCreateDossierModal.set(false)" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2>Create Regulatory Dossier</h2>
        <p class="modal-sub">Define submission type, target market and assigned officer.</p>
        <form (ngSubmit)="handleCreateDossier()">
          <div class="form-grid">
            <div class="field">
              <label>Dossier Code<span class="req">*</span></label>
              <input type="text" name="dosId" [value]="createDossierForm.dossierId" disabled>
              <div class="hint">Auto-generated</div>
            </div>
            <div class="field">
              <label>Target Product<span class="req">*</span></label>
              <select name="productId" [(ngModel)]="createDossierForm.productId" required>
                <option *ngFor="let p of products()" [value]="p.productId">{{ p.productName }}</option>
              </select>
            </div>
            <div class="field">
              <label>Submission Type<span class="req">*</span></label>
              <select name="subType" [(ngModel)]="createDossierForm.submissionType" required>
                <option value="NDA">NDA (New Drug Application)</option>
                <option value="ANDA">ANDA (Abbreviated NDA)</option>
                <option value="BLA">BLA (Biologics License App)</option>
                <option value="IND">IND (Investigational NDA)</option>
              </select>
            </div>
            <div class="field">
              <label>Target Market Region<span class="req">*</span></label>
              <input type="text" name="market" [(ngModel)]="createDossierForm.targetMarket" placeholder="e.g. FDA (United States)" required>
            </div>
            <div class="field">
              <label>Assigned Regulatory Officer ID<span class="req">*</span></label>
              <input type="text" name="officer" [(ngModel)]="createDossierForm.assignedOfficerId" required>
            </div>
            <div class="field">
              <label>Submission Date<span class="req">*</span></label>
              <input type="date" name="subDate" [(ngModel)]="createDossierForm.submissionDate" required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Create Dossier</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 2. CREATE MILESTONE MODAL -->
    <div class="modal-overlay" *ngIf="showCreateMilestoneModal()">
      <div class="modal">
        <button type="button" class="modal-close-x" (click)="confirmDiscard() && showCreateMilestoneModal.set(false)" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2>Create Regulatory Milestone</h2>
        <p class="modal-sub">Track a submission milestone for this dossier.</p>
        <form (ngSubmit)="handleCreateMilestone()">
          <div class="form-grid">
            <div class="field">
              <label>Milestone Code<span class="req">*</span></label>
              <input type="text" name="msId" [value]="createMilestoneForm.milestoneId" disabled>
              <div class="hint">Auto-generated</div>
            </div>
            <div class="field">
              <label>Milestone Type<span class="req">*</span></label>
              <input type="text" name="msType" [(ngModel)]="createMilestoneForm.milestoneType" placeholder="e.g. FDA Panel Review" required>
            </div>
            <div class="field">
              <label>Date Scheduled<span class="req">*</span></label>
              <input type="date" name="msDate" [(ngModel)]="createMilestoneForm.milestoneDate" required>
            </div>
            <div class="field">
              <label>Milestone Status<span class="req">*</span></label>
              <select name="msStatus" [(ngModel)]="createMilestoneForm.status" required>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Delayed">Delayed</option>
              </select>
            </div>
            <div class="field full">
              <label>Additional Notes / Directives<span class="req">*</span></label>
              <input type="text" name="msNotes" [(ngModel)]="createMilestoneForm.notes" placeholder="Panel session scheduled at 10 AM EST." required>
            </div>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary">Create Milestone</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 3. ELECTRONIC SIGNATURE DIALOG -->
    <div class="modal-overlay" *ngIf="showSignatureModal()">
      <div class="modal modal-sm">
        <button type="button" class="modal-close-x" (click)="confirmDiscard() && showSignatureModal.set(false)" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2>Electronic Signature Verification</h2>
        <p class="modal-sub">You are applying a legally binding electronic signature to APPROVE this drug regulatory dossier submission.</p>
        <div class="detail-grid">
          <div class="detail-field"><label>Action</label><div class="value">Transition to Approved</div></div>
          <div class="detail-field"><label>Meaning</label><div class="value">APPROVED</div></div>
        </div>
        <form (ngSubmit)="executeSignatureTransition()">
          <div class="field full">
            <label>Verify Identity Password<span class="req">*</span></label>
            <input type="password" name="sigPwd" [(ngModel)]="signaturePassword" placeholder="Enter your credentials password" required>
          </div>
          <div class="modal-footer">
            <button type="submit" class="btn btn-primary" [disabled]="signing()">
              {{ signing() ? 'Signing...' : 'Verify & Approve' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .breadcrumb a{color:var(--text-dim);text-decoration:none;cursor:pointer;}
    .breadcrumb a:hover{text-decoration:underline;color:var(--accent-dark);}
    .breadcrumb strong{color:var(--text);font-weight:700;}
    .filter-select{position:relative;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:#fff;padding:0 12px;min-width:200px;}
    .filter-select .funnel{color:var(--text-dim);flex-shrink:0;pointer-events:none;}
    .filter-select .caret{color:var(--text-dim);flex-shrink:0;margin-left:auto;pointer-events:none;}
    .filter-select select{appearance:none;-webkit-appearance:none;-moz-appearance:none;border:none;background:transparent;outline:none;font-family:inherit;font-size:14px;color:var(--text);padding:11px 4px;flex:1;width:100%;cursor:pointer;}
    .code-strong{color:var(--accent);font-weight:800;}
    .badge-draft{background:#eef0ef;color:#3c463f;}
    .pager button:disabled{opacity:.45;cursor:not-allowed;}
    .empty-state{padding:48px 20px;text-align:center;color:var(--text-dim);font-size:14px;}
    .empty-state svg{display:block;margin:0 auto 12px;color:#c9beb4;}
    .empty-state strong{display:block;color:var(--text);font-size:15.5px;font-weight:700;margin-bottom:4px;}
    .view-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:30px 34px;}
    .detail-top{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;}
    .view-card .page-title{font-size:24px;}
    .status-row{display:flex;align-items:center;gap:28px;flex-wrap:wrap;margin:22px 0 6px;padding:20px 24px;background:#fbfaf8;border:1px solid var(--border);border-radius:var(--radius-md);}
    .status-row .detail-field{min-width:120px;}
    .status-action-btns{display:flex;gap:12px;align-items:center;margin-left:auto;flex-wrap:wrap;}
    .workflow-group{display:flex;align-items:center;gap:9px;}
    .workflow-group label{font-size:11px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.05em;}
    .workflow-select{border:1px solid var(--border);border-radius:var(--radius-sm);padding:9px 12px;font-size:13.5px;font-family:inherit;background:#fff;color:var(--text);cursor:pointer;}
    .workflow-select:focus{border-color:var(--accent);outline:none;}
    .detail-tabs{display:flex;gap:6px;margin:26px 0 20px;border-bottom:1px solid var(--border);}
    .detail-tabs button{background:none;border:none;border-bottom:2px solid transparent;padding:11px 16px;font-size:14px;font-weight:600;color:var(--text-dim);cursor:pointer;font-family:inherit;margin-bottom:-1px;transition:color .15s ease,border-color .15s ease;}
    .detail-tabs button:hover{color:var(--accent-dark);}
    .detail-tabs button.active{color:var(--accent);border-bottom-color:var(--accent);}
    .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
    .section-head h3{margin:0;font-size:16px;font-weight:800;}
    .section-box{border:1px solid var(--border);border-radius:var(--radius-md);overflow:hidden;}
    .mini-table{width:100%;border-collapse:collapse;}
    .mini-table th{text-align:left;padding:12px 18px;font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--text-dim);text-transform:uppercase;background:#fbfaf8;border-bottom:1px solid var(--border);}
    .mini-table td{padding:14px 18px;font-size:14px;border-bottom:1px solid var(--border);color:var(--text);}
    .mini-table tr:last-child td{border-bottom:none;}
    .hash-cell{font-family:monospace;font-size:11px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-dim);}
    .timeline{position:relative;margin-top:18px;padding-left:30px;}
    .timeline::before{content:'';position:absolute;left:8px;top:6px;bottom:6px;width:2px;background:var(--border);}
    .timeline-item{position:relative;margin-bottom:18px;}
    .timeline-item:last-child{margin-bottom:0;}
    .timeline-dot{position:absolute;left:-27px;top:6px;width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid var(--accent);box-sizing:border-box;}
    .timeline-item.done .timeline-dot{background:var(--accent);}
    .timeline-card{background:#fbfaf8;border:1px solid var(--border);border-radius:var(--radius-md);padding:14px 16px;}
    .timeline-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;}
    .timeline-title{font-size:14.5px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .timeline-date{font-size:12.5px;color:var(--text-dim);margin-bottom:6px;}
    .timeline-notes{font-size:13.5px;color:var(--text);line-height:1.5;}
    .modal h2{margin:0 0 4px;}
    .modal-sub{color:var(--text-dim);font-size:14px;margin:0 0 24px;}
    .modal-sm{max-width:460px;}
    .hint{font-size:11.5px;color:var(--text-dim);margin-top:6px;}
    .alert{padding:11px 15px;border-radius:var(--radius-sm);margin-bottom:18px;font-size:13.5px;}
    .alert-error{background:var(--danger-light);color:var(--danger);border:1px solid #f5c2c0;}
    .alert-success{background:#e6f4ec;color:#2f7d4f;border:1px solid #c3e6d1;}
  `]
})
export class RegulatoryComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  dossiers = signal<any[]>([]);
  products = signal<any[]>([]);

  // Selection
  selectedDossier = signal<any | null>(null);
  detailTab = signal<'dossier' | 'milestones' | 'history'>('dossier');

  // Sub-logs
  milestones = signal<any[]>([]);
  signatureHistory = signal<any[]>([]);

  // Pagination
  page = signal<number>(1);
  pageSize = 8;
  totalPages = signal<number>(1);

  // Modals Visibility
  showCreateDossierModal = signal<boolean>(false);
  showCreateMilestoneModal = signal<boolean>(false);
  showSignatureModal = signal<boolean>(false);

  // Form Models
  createDossierForm = {
    dossierId: '',
    productId: null as any,
    submissionType: 'NDA',
    targetMarket: '',
    submissionDate: '',
    assignedOfficerId: '1',
    status: 'Draft'
  };

  createMilestoneForm = {
    milestoneId: '',
    milestoneType: '',
    milestoneDate: '',
    notes: '',
    status: 'Scheduled'
  };

  // Electronic Signature
  signaturePassword = '';
  targetStatus = signal<string>('');
  signing = signal<boolean>(false);

  ngOnInit() {
    this.fetchProducts();
    this.fetchDossiers();
  }

  fetchDossiers() {
    this.apiService.getDossiers().subscribe({
      next: (data) => {
        this.dossiers.set(data || []);
        this.totalPages.set(Math.ceil(data.length / this.pageSize) || 1);
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching regulatory dossiers registry.')
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

  paginatedDossiers() {
    const start = (this.page() - 1) * this.pageSize;
    return this.dossiers().slice(start, start + this.pageSize);
  }

  getProductName(productId: any): string {
    const p = this.products().find(item => String(item.productId) === String(productId));
    return p ? p.productName : `Prod ID: ${productId}`;
  }

  viewDossierDetails(dos: any) {
    this.selectedDossier.set(dos);
    this.detailTab.set('dossier');
    this.clearMessages();
    this.fetchMilestones(dos.dossierId);
    this.fetchSignatureHistory(dos.dossierId);
  }

  fetchMilestones(dossierId: string) {
    this.apiService.getMilestonesByDossier(dossierId).subscribe({
      next: (data) => this.milestones.set(data || []),
      error: () => this.milestones.set([])
    });
  }

  fetchSignatureHistory(dossierId: string) {
    this.apiService.getSignatures('RegulatoryDossier', dossierId).subscribe({
      next: (res) => {
        if (res.success) {
          this.signatureHistory.set(res.data || []);
        }
      },
      error: () => this.signatureHistory.set([])
    });
  }

  openCreateDossierModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.createDossierForm = {
      dossierId: `DOS-${rand}`,
      productId: this.products()[0]?.productId || null,
      submissionType: 'NDA',
      targetMarket: 'EMA (European Union)',
      submissionDate: new Date().toISOString().substring(0, 10),
      assignedOfficerId: '1',
      status: 'Draft'
    };
    this.showCreateDossierModal.set(true);
    this.clearMessages();
  }

  handleCreateDossier() {
    this.apiService.createDossier(this.createDossierForm).subscribe({
      next: () => {
        this.showSuccess('Regulatory dossier compiled successfully in Draft state.');
        this.showCreateDossierModal.set(false);
        this.fetchDossiers();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to initialize regulatory dossier.')
    });
  }

  transitionStateDirect(target: string) {
    this.clearMessages();
    const payload = {
      ...this.selectedDossier(),
      status: target
    };

    this.apiService.updateDossier(payload).subscribe({
      next: () => {
        this.showSuccess(`Dossier transitioned to state: ${target}`);

        // Reload details
        const updatedDos = { ...this.selectedDossier(), status: target };
        this.selectedDossier.set(updatedDos);
        this.fetchDossiers();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to transition dossier state.')
    });
  }

  openCreateMilestoneModal() {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.createMilestoneForm = {
      milestoneId: `MS-${rand}`,
      milestoneType: 'Dossier Validation Pass',
      milestoneDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      notes: 'Initial validation check pass by regulatory officer.',
      status: 'Scheduled'
    };
    this.showCreateMilestoneModal.set(true);
    this.clearMessages();
  }

  handleCreateMilestone() {
    const payload = {
      ...this.createMilestoneForm,
      dossierId: this.selectedDossier().dossierId
    };

    this.apiService.createMilestone(payload).subscribe({
      next: () => {
        this.showSuccess('Regulatory milestone timeline scheduled.');
        this.showCreateMilestoneModal.set(false);
        this.fetchMilestones(payload.dossierId);
      },
      error: (err) => this.showError(err.error?.message || 'Failed to schedule milestone.')
    });
  }

  openSignatureModal(target: string) {
    this.targetStatus.set(target);
    this.signaturePassword = '';
    this.showSignatureModal.set(true);
    this.clearMessages();
  }

  onStatusChangeSelect(e: any) {
    const val = e.target.value;
    if (val === 'Approved') {
      this.openSignatureModal('Approved');
    } else if (val) {
      this.transitionStateDirect(val);
    }
    e.target.value = '';
  }

  executeSignatureTransition() {
    this.signing.set(true);
    this.clearMessages();

    // Create approving signature:
    // POST /pharmaTrack/identityAccess/signatures
    const signaturePayload = {
      entityType: 'RegulatoryDossier',
      entityId: this.selectedDossier().dossierId,
      entityVersion: '1',
      meaning: 'APPROVED'
    };

    this.apiService.signEntity(signaturePayload).subscribe({
      next: (res) => {
        if (res.success) {
          // Transition:
          // POST /pharmaTrack/regulatoryAffairs/workflow/transition
          const transitionPayload = {
            entityType: 'RegulatoryDossier',
            entityId: this.selectedDossier().dossierId,
            targetStatus: 'Approved',
            reason: `Dossier approved by regulatory officer. Signature ID ${res.data?.signatureId}`
          };

          this.apiService.transitionWorkflow('regulatoryAffairs', transitionPayload).subscribe({
            next: () => {
              this.signing.set(false);
              this.showSignatureModal.set(false);
              this.showSuccess('Regulatory dossier signed and Approved successfully.');

              // Reload details
              const updatedDos = { ...this.selectedDossier(), status: 'Approved' };
              this.selectedDossier.set(updatedDos);
              this.fetchDossiers();
              this.fetchSignatureHistory(updatedDos.dossierId);
            },
            error: (err) => {
              this.signing.set(false);
              this.showError(`Signature applied, but state transition failed: ${err.error?.message || err.message}`);
            }
          });
        } else {
          this.signing.set(false);
          this.showError(`Electronic Signature Rejected: ${res.message}`);
        }
      },
      error: (err) => {
        this.signing.set(false);
        this.showError(`Identity verification failed. Signature rejected.`);
      }
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
