import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface Country { name: string; dial: string; flag: string; }

@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="content">
      <!-- Title & Action -->
      <div class="page-head">
        <div>
          <h1 class="page-title">User Administration</h1>
          <div class="page-sub">Configure and manage users and their site assignments.</div>
        </div>
        <div class="actions-row">
          <div class="tooltip-wrap">
            <button class="btn btn-primary btn-create user-create-btn" (click)="openCreateUserModal()" aria-label="Create User">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              User
            </button>
            <span class="tooltip">Create User</span>
          </div>
        </div>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- KPI cards -->
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card tone-neutral">
          <div class="kpi-top">
            <div class="kpi-label">Total Users</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          </div>
          <div class="kpi-value">{{ totalUsers() }}</div>
        </div>
        <div class="kpi-card tone-accent">
          <div class="kpi-top">
            <div class="kpi-label">Active</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m22 4-10 10-3-3"/></svg></div>
          </div>
          <div class="kpi-value">{{ countByStatus('Active') }}</div>
        </div>
        <div class="kpi-card tone-warning">
          <div class="kpi-top">
            <div class="kpi-label">Locked</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg></div>
          </div>
          <div class="kpi-value">{{ countByStatus('Locked') }}</div>
        </div>
        <div class="kpi-card tone-neutral">
          <div class="kpi-top">
            <div class="kpi-label">Inactive</div>
            <div class="kpi-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="11" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg></div>
          </div>
          <div class="kpi-value">{{ countByStatus('Inactive') }}</div>
        </div>
      </div>

      <!-- USERS -->
      <div>
        <!-- Filter row -->
        <div class="filter-row">
          <div class="input-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" placeholder="Search name or email...">
          </div>
          <div class="filter-select">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select [(ngModel)]="statusFilter" (change)="applyFilters()" name="statusFilter" [ngModelOptions]="{standalone:true}" aria-label="Filter by Status">
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Locked">Locked</option>
              <option value="Deactivated">Deactivated</option>
            </select>
            <svg class="caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>

        <!-- Table -->
        <div class="table-card">
          <div class="table-card-head">
            <h3>All Users <span class="count">{{ filteredUsers().length }} total</span></h3>
            <div class="actions-row">
              <div class="dropdown">
                <button class="btn btn-outline" (click)="toggleExportMenu()" aria-label="Export">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
                  Export
                  <svg class="btn-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                <div class="dropdown-menu dropdown-menu-right" [class.open]="exportMenuOpen()">
                  <button type="button" class="dropdown-item" (click)="exportAs('pdf')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
                    Export as PDF
                  </button>
                  <button type="button" class="dropdown-item" (click)="exportAs('excel')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>
                    Export as Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="users-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Site Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let user of paginatedUsers()">
                  <td>
                    <div class="name-cell">{{ user.name }}</div>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.role }}</td>
                  <td>{{ getSiteName(user.siteId) }}</td>
                  <td>
                    <span class="badge-status" [ngClass]="badgeClass(user.status)">
                      {{ user.status }}
                    </span>
                  </td>
                  <td>
                    <!-- Row action menu -->
                    <div class="dropdown">
                      <button class="icon-menu-btn" (click)="toggleActionDropdown(user.userId)" aria-label="Row actions">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      <div class="dropdown-menu dropdown-menu-right" [class.open]="openedActionUser() === user.userId">
                        <button type="button" class="dropdown-item" (click)="viewUser(user)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                          View
                        </button>
                        <button type="button" class="dropdown-item" (click)="openEditUserModal(user)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                          Edit
                        </button>
                        <div class="dropdown-divider"></div>
                        <button type="button" class="dropdown-item danger" *ngIf="user.status === 'Active'" (click)="deactivateUser(user.userId)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>
                          Deactivate
                        </button>
                        <button type="button" class="dropdown-item" *ngIf="user.status === 'Locked'" (click)="unlockUserAccount(user.userId)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                          Unlock
                        </button>
                        <button type="button" class="dropdown-item" *ngIf="user.status !== 'Active' && user.status !== 'Locked'" (click)="reactivateUser(user.userId)">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                          {{ user.status === 'Inactive' ? 'Activate' : 'Reactivate' }}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr *ngIf="filteredUsers().length === 0">
                  <td colspan="6" class="empty-cell">No users registered matching filter parameters.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Pagination -->
          <div class="table-footer" *ngIf="filteredUsers().length > 0">
            <div>Page {{ userPage() }} of {{ userTotalPages() }}</div>
            <div class="pager">
              <button [disabled]="userPage() === 1" (click)="userPage.set(userPage() - 1)" aria-label="Previous page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span style="padding:0 4px;">{{ userPage() }} / {{ userTotalPages() }}</span>
              <button [disabled]="userPage() === userTotalPages()" (click)="userPage.set(userPage() + 1)" aria-label="Next page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── MODALS ── -->

      <!-- A. CREATE USER MODAL -->
      <div class="modal-overlay" *ngIf="showCreateUserModal()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="attemptCloseCreate()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Create User</h2>
          <div class="page-sub" style="margin:-16px 0 24px 0;">Add a new user to PharmaTrack</div>
          <form (ngSubmit)="handleCreateUser()">
            <div class="form-grid">
              <div class="field">
                <label>Full Name<span class="req">*</span></label>
                <input type="text" name="name" [(ngModel)]="createUserForm.name" maxlength="100" placeholder="e.g. Jane Doe" required>
                <div class="field-hint">{{ createUserForm.name.length }} / 100 Characters</div>
              </div>
              <div class="field">
                <label>Email<span class="req">*</span></label>
                <input type="email" name="email" [(ngModel)]="createUserForm.email" placeholder="name@company.com" required>
              </div>
              <div class="field">
                <label>Role<span class="req">*</span></label>
                <select name="roleId" [(ngModel)]="createUserForm.roleId" required>
                  <option *ngFor="let role of roles()" [value]="role.roleId">{{ role.roleName }}</option>
                </select>
                <button type="button" class="link-btn" (click)="openPermissionsModal(createUserForm.roleId)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
                  View Permissions
                </button>
              </div>
              <div class="field">
                <label>Phone Number<span class="req">*</span></label>
                <div class="phone-input">
                  <div class="country-select">
                    <button type="button" class="country-code country-trigger" (click)="toggleCountryDropdown()" aria-label="Select country code">
                      <span class="flag">{{ selectedCountry().flag }}</span>
                      <span>{{ selectedCountry().dial }}</span>
                      <svg class="caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <div class="country-dropdown" *ngIf="showCountryDropdown()">
                      <div class="country-search">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="text" placeholder="Search country" [ngModel]="countrySearch()" (ngModelChange)="countrySearch.set($event)" name="countrySearch" [ngModelOptions]="{standalone:true}" autocomplete="off">
                      </div>
                      <div class="country-list">
                        <button type="button" class="country-option" *ngFor="let c of filteredCountries()" (click)="selectCountry(c)">
                          <span class="flag">{{ c.flag }}</span>
                          <span class="cname">{{ c.name }}</span>
                          <span class="cdial">{{ c.dial }}</span>
                        </button>
                        <div class="country-empty" *ngIf="filteredCountries().length === 0">No matches found</div>
                      </div>
                    </div>
                  </div>
                  <input type="tel" name="phone" [ngModel]="createUserForm.phone" (ngModelChange)="onPhoneInput($event)" (blur)="phoneTouched.set(true)" placeholder="10-digit mobile number" maxlength="10" inputmode="numeric" required>
                </div>
                <div class="phone-meta">
                  <span class="field-error" *ngIf="(phoneTouched() || createSubmitted()) && createUserForm.phone.length !== 10">Enter exactly 10 digits</span>
                  <span class="field-hint">{{ createUserForm.phone.length }}/10</span>
                </div>
              </div>
              <div class="field">
                <label>Site Name<span class="req">*</span></label>
                <select name="siteId" [(ngModel)]="createUserForm.siteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
              <div class="field filled">
                <label>Password<span class="req">*</span></label>
                <input type="password" name="password" [(ngModel)]="createUserForm.password" placeholder="e.g. Admin@123" required>
                <div class="pw-criteria" *ngIf="createUserForm.password || createSubmitted()">
                  <span [class.met]="pwMinLen()">8+ characters</span>
                  <span [class.met]="pwUpper()">1 uppercase</span>
                  <span [class.met]="pwNumber()">1 number</span>
                  <span [class.met]="pwSymbol()">1 special</span>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- B. EDIT USER MODAL -->
      <div class="modal-overlay" *ngIf="showEditUserModal()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="attemptCloseEdit()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Edit User</h2>
          <div class="page-sub" style="margin:-16px 0 24px 0;">Update user details and role</div>
          <form (ngSubmit)="handleEditUser()">
            <div class="form-grid">
              <div class="field">
                <label>Full Name<span class="req">*</span></label>
                <input type="text" name="editName" [(ngModel)]="editUserForm.name" maxlength="100" required>
                <div class="field-hint">{{ editUserForm.name.length }} / 100 Characters</div>
              </div>
              <div class="field">
                <label>Role<span class="req">*</span></label>
                <select name="editRoleId" [(ngModel)]="editUserForm.roleId" required>
                  <option *ngFor="let role of roles()" [value]="role.roleId">{{ role.roleName }}</option>
                </select>
                <button type="button" class="link-btn" (click)="openPermissionsModal(editUserForm.roleId)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>
                  View Permissions
                </button>
              </div>
              <div class="field">
                <label>Email</label>
                <input type="email" name="editEmail" [ngModel]="editUserForm.email" [ngModelOptions]="{standalone:true}" disabled>
                <div class="field-hint">Email cannot be changed</div>
              </div>
              <div class="field">
                <label>Mobile Number</label>
                <div class="phone-input">
                  <div class="country-select">
                    <button type="button" class="country-code country-trigger" (click)="toggleEditCountryDropdown()" aria-label="Select country code">
                      <span class="flag">{{ selectedEditCountry().flag }}</span>
                      <span>{{ selectedEditCountry().dial }}</span>
                      <svg class="caret" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <div class="country-dropdown" *ngIf="showEditCountryDropdown()">
                      <div class="country-search">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input type="text" placeholder="Search country" [ngModel]="editCountrySearch()" (ngModelChange)="editCountrySearch.set($event)" name="editCountrySearch" [ngModelOptions]="{standalone:true}" autocomplete="off">
                      </div>
                      <div class="country-list">
                        <button type="button" class="country-option" *ngFor="let c of filteredEditCountries()" (click)="selectEditCountry(c)">
                          <span class="flag">{{ c.flag }}</span>
                          <span class="cname">{{ c.name }}</span>
                          <span class="cdial">{{ c.dial }}</span>
                        </button>
                        <div class="country-empty" *ngIf="filteredEditCountries().length === 0">No matches found</div>
                      </div>
                    </div>
                  </div>
                  <input type="tel" name="editPhone" [ngModel]="editUserForm.phone" (ngModelChange)="onEditPhoneInput($event)" (blur)="editPhoneTouched.set(true)" placeholder="10-digit mobile number" maxlength="10" inputmode="numeric">
                </div>
                <div class="phone-meta">
                  <span class="field-error" *ngIf="editPhoneTouched() && editUserForm.phone.length !== 10">Enter exactly 10 digits</span>
                  <span class="field-hint">{{ editUserForm.phone.length }}/10</span>
                </div>
              </div>
              <div class="field">
                <label>Site Name<span class="req">*</span></label>
                <select name="editSiteId" [(ngModel)]="editUserForm.siteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- C. VIEW USER DETAILS MODAL -->
      <div class="modal-overlay" *ngIf="selectedUser()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="selectedUser.set(null)" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>User Details</h2>
          <div class="detail-grid">
            <div class="detail-field"><label>User Name</label><div class="value">{{ selectedUser().name }}</div></div>
            <div class="detail-field"><label>Email Address</label><div class="value">{{ selectedUser().email }}</div></div>
            <div class="detail-field"><label>Assigned Role</label><div class="value">{{ selectedUser().role }}</div></div>
            <div class="detail-field"><label>Phone</label><div class="value" [class.dim]="!selectedUser().phone">{{ selectedUser().phone || '—' }}</div></div>
            <div class="detail-field"><label>Site Assigned</label><div class="value">{{ getSiteName(selectedUser().siteId) }}</div></div>
          </div>
          <div class="detail-field" style="margin-top:8px;">
            <label>Status</label>
            <span class="badge-status" [ngClass]="badgeClass(selectedUser().status)">{{ selectedUser().status }}</span>
          </div>
        </div>
      </div>

      <!-- D. ROLE PERMISSIONS MODAL -->
      <div class="modal-overlay" *ngIf="showPermissionsModal()">
        <div class="modal">
          <button type="button" class="modal-close-x" (click)="closePermissionsModal()" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
          <h2>Role Permissions</h2>
          <div class="page-sub" style="margin:-16px 0 8px 0;">Read-only view of permissions granted to each role.</div>
          <div class="permissions-layout">
            <div class="role-tabs">
              <button type="button" class="role-tab" *ngFor="let rn of rbacRoles" [class.active]="permRoleName() === rn" (click)="selectPermissionRole(rn)">
                {{ rn }}
              </button>
            </div>
            <div class="permissions-list">
              <ng-container *ngIf="selectedRbac() as entry; else pickRole">
                <div class="perm-group" *ngFor="let g of entry.groups">
                  <div class="perm-group-title">{{ g.module }}</div>
                  <div class="perm-row granted" *ngFor="let perm of g.perms">
                    <svg class="granted-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    {{ perm }}
                  </div>
                </div>
                <div class="perm-group" *ngIf="entry.workflow && entry.workflow.length">
                  <div class="perm-group-title">Permitted Workflow</div>
                  <div class="perm-row" *ngFor="let w of entry.workflow">
                    <svg class="wf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
                    {{ w }}
                  </div>
                </div>
                <div class="perm-group" *ngIf="entry.restrictions && entry.restrictions.length">
                  <div class="perm-group-title">Restrictions</div>
                  <div class="perm-row denied" *ngFor="let r of entry.restrictions">
                    <svg class="denied-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    {{ r }}
                  </div>
                </div>
              </ng-container>
              <ng-template #pickRole>
                <div class="perm-empty">Select a role to view its permissions.</div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Compact create button tooltip */
    .tooltip-wrap { position: relative; display: inline-flex; }
    .tooltip-wrap .tooltip {
      position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%);
      background: #211611; color: #fff; font-size: 12px; font-weight: 600;
      padding: 5px 9px; border-radius: 6px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity .15s ease; z-index: 80;
    }
    .tooltip-wrap .tooltip::after {
      content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
      border: 5px solid transparent; border-top-color: #211611;
    }
    .tooltip-wrap:hover .tooltip { opacity: 1; }

    /* Single status filter control */
    .filter-select {
      display: flex; align-items: center; gap: 8px;
      padding: 0 12px; min-width: 220px;
      border: 1px solid var(--border); border-radius: var(--radius-sm);
      background: #fff; color: var(--text-dim);
    }
    .filter-select > svg { flex-shrink: 0; }
    .filter-select .caret { flex-shrink: 0; }
    .filter-select select {
      flex: 1; border: none; background: transparent; outline: none;
      padding: 11px 4px; font-size: 14px; font-family: inherit;
      color: var(--text); cursor: pointer; appearance: none; -webkit-appearance: none;
    }

    /* Export button caret */
    .btn-caret { margin-left: 2px; }

    /* Alerts */
    .alert { padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 20px; font-size: 13.5px; font-weight: 500; }
    .alert-error { background: var(--danger-light); color: var(--danger); border: 1px solid #f0c9c7; }
    .alert-success { background: var(--accent-light); color: var(--accent-dark); border: 1px solid #f0c9a8; }

    /* Empty table state */
    .empty-cell { text-align: center; color: var(--text-dim); font-style: italic; padding: 28px 24px; }

    /* Table wrapper: no overflow clipping so the row action menu is never cut off.
       Sticky header rides the page scroll instead of an inner scroll container. */
    .users-table-wrap { width: 100%; overflow: visible; }
    .users-table-wrap thead th {
      position: sticky; top: 0; z-index: 2; background: var(--card);
    }

    /* Status badges */
    .badge-success { background: #e4f4e8; color: #1f7a37; }
    .badge-danger { background: var(--danger-light); color: var(--danger); }
    .badge-warning { background: var(--warning-light); color: var(--warning); }
    /* Compact create button: minimal space between the + icon and the label */
    .user-create-btn { gap: 3px; }
    /* Password strength criteria chips */
    .pw-criteria { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .pw-criteria span {
      font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 20px;
      background: var(--danger-light); color: var(--danger);
      display: inline-flex; align-items: center; gap: 5px; transition: background .15s, color .15s;
    }
    .pw-criteria span::before { content: '✕'; font-size: 10px; }
    .pw-criteria span.met { background: #e4f4e8; color: #1f7a37; }
    .pw-criteria span.met::before { content: '✓'; }
    /* KPI cards: all four on a single full-width row (minmax(0,..) lets tracks shrink so the row never overflows) */
    .kpi-grid.kpi-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    @media (max-width: 760px) { .kpi-grid.kpi-grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

    /* Searchable country selector */
    .country-select { position: relative; flex-shrink: 0; }
    .country-trigger {
      display: flex; align-items: center; gap: 6px;
      min-width: 96px; max-width: 110px; cursor: pointer;
    }
    .country-trigger .caret { margin-left: auto; color: var(--text-dim); }
    .country-dropdown {
      position: absolute; top: calc(100% + 6px); left: 0; z-index: 70;
      width: 300px; background: #fff; border: 1px solid var(--border);
      border-radius: var(--radius-md); box-shadow: 0 14px 34px rgba(30,16,8,.16); padding: 8px;
    }
    .country-search {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; margin-bottom: 8px;
      border: 1px solid var(--border); border-radius: var(--radius-sm);
    }
    .country-search svg { color: var(--text-dim); flex-shrink: 0; }
    .country-search input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14px; font-family: inherit; padding: 0; color: var(--text);
    }
    .country-list { max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px; }
    .country-option {
      display: flex; align-items: center; gap: 10px; width: 100%;
      padding: 8px 10px; border: none; background: none; cursor: pointer;
      font-family: inherit; font-size: 14px; text-align: left; color: var(--text); border-radius: 6px;
    }
    .country-option:hover { background: #f2f5f3; }
    .country-option .cname { flex: 1; }
    .country-option .cdial { color: var(--text-dim); font-variant-numeric: tabular-nums; }
    .country-option .flag, .country-trigger .flag { font-size: 16px; line-height: 1; }
    .country-empty { padding: 12px; text-align: center; color: var(--text-dim); font-size: 13px; }

    /* Phone validation meta */
    .phone-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 6px; gap: 12px; }
    .phone-meta .field-hint { margin-top: 0; }
    .field-error { color: var(--danger); font-size: 12px; font-weight: 600; }

    /* Permissions modal states */
    .perm-loading, .perm-empty { padding: 22px 4px; color: var(--text-dim); font-size: 14px; }
    /* Grouped permissions (by module) */
    .perm-group { margin-bottom: 18px; }
    .perm-group:last-child { margin-bottom: 0; }
    .perm-group-title {
      font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
      color: var(--text-dim); margin: 0 0 8px 2px; padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }
    .perm-row .wf-icon { color: var(--blue); flex-shrink: 0; }
    .permissions-list { max-height: 62vh; overflow-y: auto; }

    /* Modal footer spacing */
    .modal-footer { gap: 12px; }

    /* Responsive permissions layout */
    @media (max-width: 640px) {
      .permissions-layout { flex-direction: column; }
      .role-tabs { border-right: none; border-bottom: 1px solid var(--border); padding-right: 0; padding-bottom: 12px; min-width: 0; }
    }
  `]
})
export class UsersComponent implements OnInit {
  private apiService = inject(ApiService);

  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Data arrays
  users = signal<any[]>([]);
  sites = signal<any[]>([]);
  roles = signal<any[]>([]);

  // Filter params
  statusFilter = 'All';
  filteredUsers = signal<any[]>([]);

  // Dropdown helper
  openedActionUser = signal<number | null>(null);

  // Export menu
  exportMenuOpen = signal<boolean>(false);

  // Pagination states
  userPage = signal<number>(1);
  pageSize = 8;
  userTotalPages = signal<number>(1);

  // Modals Visibility
  showCreateUserModal = signal<boolean>(false);
  showEditUserModal = signal<boolean>(false);
  selectedUser = signal<any>(null);

  // Country selector state
  showCountryDropdown = signal<boolean>(false);
  countrySearch = signal<string>('');
  showEditCountryDropdown = signal<boolean>(false);
  editCountrySearch = signal<string>('');

  // Phone validation state
  phoneTouched = signal<boolean>(false);
  editPhoneTouched = signal<boolean>(false);
  createSubmitted = signal<boolean>(false);

  // Role Permissions modal state
  showPermissionsModal = signal<boolean>(false);
  permRoleName = signal<string | null>(null);
  permissionRoleId = signal<any>(null);
  rolePermissions = signal<any[]>([]);
  permissionsLoading = signal<boolean>(false);

  // Unsaved-change snapshots
  private createSnapshot = '';
  private editSnapshot = '';

  // Comprehensive country list (name, dial code, flag emoji)
  countries: Country[] = [
    { name: 'India', dial: '+91', flag: '🇮🇳' },
    { name: 'United States', dial: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
    { name: 'Canada', dial: '+1', flag: '🇨🇦' },
    { name: 'Australia', dial: '+61', flag: '🇦🇺' },
    { name: 'Germany', dial: '+49', flag: '🇩🇪' },
    { name: 'France', dial: '+33', flag: '🇫🇷' },
    { name: 'Italy', dial: '+39', flag: '🇮🇹' },
    { name: 'Spain', dial: '+34', flag: '🇪🇸' },
    { name: 'Portugal', dial: '+351', flag: '🇵🇹' },
    { name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
    { name: 'Belgium', dial: '+32', flag: '🇧🇪' },
    { name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
    { name: 'Austria', dial: '+43', flag: '🇦🇹' },
    { name: 'Sweden', dial: '+46', flag: '🇸🇪' },
    { name: 'Norway', dial: '+47', flag: '🇳🇴' },
    { name: 'Denmark', dial: '+45', flag: '🇩🇰' },
    { name: 'Finland', dial: '+358', flag: '🇫🇮' },
    { name: 'Ireland', dial: '+353', flag: '🇮🇪' },
    { name: 'Poland', dial: '+48', flag: '🇵🇱' },
    { name: 'Czech Republic', dial: '+420', flag: '🇨🇿' },
    { name: 'Greece', dial: '+30', flag: '🇬🇷' },
    { name: 'Russia', dial: '+7', flag: '🇷🇺' },
    { name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
    { name: 'Turkey', dial: '+90', flag: '🇹🇷' },
    { name: 'Romania', dial: '+40', flag: '🇷🇴' },
    { name: 'Hungary', dial: '+36', flag: '🇭🇺' },
    { name: 'China', dial: '+86', flag: '🇨🇳' },
    { name: 'Japan', dial: '+81', flag: '🇯🇵' },
    { name: 'South Korea', dial: '+82', flag: '🇰🇷' },
    { name: 'Singapore', dial: '+65', flag: '🇸🇬' },
    { name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
    { name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
    { name: 'Thailand', dial: '+66', flag: '🇹🇭' },
    { name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
    { name: 'Philippines', dial: '+63', flag: '🇵🇭' },
    { name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
    { name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
    { name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
    { name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
    { name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
    { name: 'Nepal', dial: '+977', flag: '🇳🇵' },
    { name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
    { name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
    { name: 'Qatar', dial: '+974', flag: '🇶🇦' },
    { name: 'Kuwait', dial: '+965', flag: '🇰🇼' },
    { name: 'Bahrain', dial: '+973', flag: '🇧🇭' },
    { name: 'Oman', dial: '+968', flag: '🇴🇲' },
    { name: 'Israel', dial: '+972', flag: '🇮🇱' },
    { name: 'Egypt', dial: '+20', flag: '🇪🇬' },
    { name: 'South Africa', dial: '+27', flag: '🇿🇦' },
    { name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
    { name: 'Kenya', dial: '+254', flag: '🇰🇪' },
    { name: 'Ghana', dial: '+233', flag: '🇬🇭' },
    { name: 'Morocco', dial: '+212', flag: '🇲🇦' },
    { name: 'Brazil', dial: '+55', flag: '🇧🇷' },
    { name: 'Argentina', dial: '+54', flag: '🇦🇷' },
    { name: 'Chile', dial: '+56', flag: '🇨🇱' },
    { name: 'Colombia', dial: '+57', flag: '🇨🇴' },
    { name: 'Mexico', dial: '+52', flag: '🇲🇽' },
    { name: 'Peru', dial: '+51', flag: '🇵🇪' },
    { name: 'New Zealand', dial: '+64', flag: '🇳🇿' }
  ];

  // Form Models
  createUserForm = {
    name: '',
    email: '',
    password: '',
    roleId: null as any,
    siteId: null as any,
    countryCode: '+1',
    phone: ''
  };

  editUserForm = {
    userId: null as any,
    name: '',
    roleId: null as any,
    siteId: null as any,
    email: '',
    countryCode: '+1',
    phone: ''
  };

  ngOnInit() {
    this.fetchSites();
    this.fetchRoles();
    this.fetchUsers();
  }

  fetchUsers() {
    this.apiService.getUsers().subscribe({
      next: (res) => {
        if (res.success) {
          this.users.set(res.data || []);
          this.applyFilters();
        }
      },
      error: (err) => this.showError(err.error?.message || 'Error fetching users')
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

  fetchRoles() {
    this.apiService.getRoles().subscribe({
      next: (res) => {
        if (res.success) {
          this.roles.set(res.data || []);
        }
      }
    });
  }

  applyFilters() {
    let result = [...this.users()];
    const f = this.statusFilter;
    if (f !== 'All') {
      // Exact status match: Active / Inactive / Locked / Deactivated
      result = result.filter(u => u.status === f);
    }

    this.filteredUsers.set(result);
    this.userPage.set(1);
    this.userTotalPages.set(Math.ceil(result.length / this.pageSize) || 1);
  }

  paginatedUsers() {
    const start = (this.userPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  }

  getSiteName(siteId: number): string {
    const site = this.sites().find(s => s.siteId === siteId);
    return site ? site.siteName : 'None';
  }

  // KPI counts
  totalUsers(): number { return this.users().length; }
  countByStatus(status: string): number { return this.users().filter(u => u.status === status).length; }

  badgeClass(status: string): string {
    switch (status) {
      case 'Active':
      case 'Approved':
        return 'badge-success';
      case 'Inactive':
      case 'Deactivated':
      case 'Rejected':
        return 'badge-danger';
      case 'Pending':
        return 'badge-warning';
      default:
        return 'badge-warning';
    }
  }

  toggleActionDropdown(userId: number) {
    if (this.openedActionUser() === userId) {
      this.openedActionUser.set(null);
    } else {
      this.openedActionUser.set(userId);
    }
  }

  toggleExportMenu() {
    this.exportMenuOpen.set(!this.exportMenuOpen());
  }

  exportAs(format: 'pdf' | 'excel') {
    this.exportUsers(format);
    this.exportMenuOpen.set(false);
  }

  viewUser(user: any) {
    this.selectedUser.set(user);
    this.openedActionUser.set(null);
  }

  // ── COUNTRY SELECTOR ──
  selectedCountry(): Country {
    const match = this.countries.find(c => c.dial === this.createUserForm.countryCode);
    return match || { name: 'Unknown', dial: this.createUserForm.countryCode, flag: '🌐' };
  }

  filteredCountries(): Country[] {
    const q = this.countrySearch().trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.toLowerCase().includes(q)
    );
  }

  toggleCountryDropdown() {
    const next = !this.showCountryDropdown();
    if (next) this.countrySearch.set('');
    this.showCountryDropdown.set(next);
  }

  selectCountry(c: Country) {
    this.createUserForm.countryCode = c.dial;
    this.showCountryDropdown.set(false);
    this.countrySearch.set('');
  }

  onPhoneInput(value: string) {
    this.createUserForm.phone = (value || '').replace(/\D/g, '').slice(0, 10);
  }

  // ── PASSWORD VALIDATION (Create User) — letters + numbers + special, e.g. Admin@123 ──
  pwMinLen(): boolean { return this.createUserForm.password.length >= 8; }
  pwUpper(): boolean { return /[A-Z]/.test(this.createUserForm.password); }
  pwNumber(): boolean { return /[0-9]/.test(this.createUserForm.password); }
  pwSymbol(): boolean { return /[^A-Za-z0-9]/.test(this.createUserForm.password); }
  createPasswordValid(): boolean {
    return this.pwMinLen() && this.pwUpper() && this.pwNumber() && this.pwSymbol();
  }

  // ── EDIT COUNTRY SELECTOR (mirrors the Create field) ──
  selectedEditCountry(): Country {
    const match = this.countries.find(c => c.dial === this.editUserForm.countryCode);
    return match || { name: 'Unknown', dial: this.editUserForm.countryCode, flag: '🌐' };
  }

  filteredEditCountries(): Country[] {
    const q = this.editCountrySearch().trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.toLowerCase().includes(q)
    );
  }

  toggleEditCountryDropdown() {
    const next = !this.showEditCountryDropdown();
    if (next) this.editCountrySearch.set('');
    this.showEditCountryDropdown.set(next);
  }

  selectEditCountry(c: Country) {
    this.editUserForm.countryCode = c.dial;
    this.showEditCountryDropdown.set(false);
    this.editCountrySearch.set('');
  }

  onEditPhoneInput(value: string) {
    this.editUserForm.phone = (value || '').replace(/\D/g, '').slice(0, 10);
  }

  // Split a stored phone (e.g. "+919876543210" or "9876543210") into dial code + 10-digit number.
  private splitPhone(raw: any): { code: string; number: string } {
    const value = (raw || '').toString().trim();
    if (value.startsWith('+')) {
      const match = [...this.countries]
        .sort((a, b) => b.dial.length - a.dial.length)
        .find(c => value.startsWith(c.dial));
      if (match) {
        return { code: match.dial, number: value.slice(match.dial.length).replace(/\D/g, '').slice(0, 10) };
      }
    }
    return { code: this.editUserForm?.countryCode || '+1', number: value.replace(/\D/g, '').slice(0, 10) };
  }

  openCreateUserModal() {
    this.createUserForm = {
      name: '',
      email: '',
      password: '',
      roleId: this.roles()[0]?.roleId || null,
      siteId: this.sites()[0]?.siteId || null,
      countryCode: '+1',
      phone: ''
    };
    this.phoneTouched.set(false);
    this.createSubmitted.set(false);
    this.showCountryDropdown.set(false);
    this.countrySearch.set('');
    this.createSnapshot = JSON.stringify(this.createUserForm);
    this.showCreateUserModal.set(true);
    this.clearMessages();
  }

  attemptCloseCreate() {
    if (JSON.stringify(this.createUserForm) !== this.createSnapshot && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    this.showCreateUserModal.set(false);
    this.showCountryDropdown.set(false);
  }

  handleCreateUser() {
    this.createSubmitted.set(true);
    if (!this.createUserForm.phone || this.createUserForm.phone.length !== 10) {
      this.showError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!this.createPasswordValid()) {
      this.showError('Password must be at least 8 characters with an uppercase letter, a number, and a special character.');
      return;
    }

    const payload = {
      name: this.createUserForm.name,
      email: this.createUserForm.email,
      password: this.createUserForm.password,
      roleId: parseInt(this.createUserForm.roleId, 10),
      siteId: parseInt(this.createUserForm.siteId, 10),
      phone: `${this.createUserForm.countryCode}${this.createUserForm.phone}`
    };

    this.apiService.createUser(payload).subscribe({
      next: () => {
        this.showSuccess('User profile created successfully.');
        this.showCreateUserModal.set(false);
        this.fetchUsers();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to create user.')
    });
  }

  openEditUserModal(user: any) {
    const { code, number } = this.splitPhone(user.phone);
    this.editUserForm = {
      userId: user.userId,
      name: user.name,
      roleId: this.roles().find(r => r.roleName === user.role)?.roleId || null,
      siteId: user.siteId,
      email: user.email || '',
      countryCode: code,
      phone: number
    };
    this.editPhoneTouched.set(false);
    this.editSnapshot = JSON.stringify(this.editUserForm);
    this.showEditUserModal.set(true);
    this.openedActionUser.set(null);
    this.clearMessages();
  }

  attemptCloseEdit() {
    if (JSON.stringify(this.editUserForm) !== this.editSnapshot && !window.confirm('Discard unsaved changes?')) {
      return;
    }
    this.showEditUserModal.set(false);
  }

  handleEditUser() {
    const payload = {
      name: this.editUserForm.name,
      roleId: parseInt(this.editUserForm.roleId, 10),
      siteId: parseInt(this.editUserForm.siteId, 10),
      phone: this.editUserForm.phone ? `${this.editUserForm.countryCode}${this.editUserForm.phone}` : ''
    };

    this.apiService.updateUser(this.editUserForm.userId, payload).subscribe({
      next: () => {
        this.showSuccess('User profile updated successfully.');
        this.showEditUserModal.set(false);
        this.fetchUsers();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to update user.')
    });
  }


  deactivateUser(userId: number) {
    this.openedActionUser.set(null);
    this.apiService.deactivateUser(userId).subscribe({
      next: () => {
        this.showSuccess('User account deactivated successfully.');
        this.fetchUsers();
      },
      error: (err) => this.showError(err.error?.message || 'Deactivation failed.')
    });
  }

  // Reactivate / Activate a Deactivated or Inactive account.
  // Uses the status-transition endpoint (Inactive -> Active) — NOT the unlock endpoint,
  // which only applies to Locked accounts and would fail with "User is not locked".
  reactivateUser(userId: number) {
    this.openedActionUser.set(null);
    this.apiService.updateUserStatus(userId, { status: 'Active', reason: 'Account reactivated by administrator' }).subscribe({
      next: () => {
        this.showSuccess('User account reactivated successfully.');
        this.fetchUsers();
      },
      error: (err) => this.showError(err.error?.message || 'Reactivation failed.')
    });
  }

  // Unlock an account that was auto-locked after 5+ failed password attempts.
  unlockUserAccount(userId: number) {
    this.openedActionUser.set(null);
    this.apiService.unlockUser(userId, { status: 'Active', reason: 'Account unlocked by administrator' }).subscribe({
      next: () => {
        this.showSuccess('User account unlocked successfully.');
        this.fetchUsers();
      },
      error: (err) => this.showError(err.error?.message || 'Unlock failed.')
    });
  }

  // ── ROLE PERMISSIONS MODAL ──
  // Canonical RBAC catalog (human-readable, grouped by module). Source of truth for the
  // read-only Role Permissions screen — the backend permission table stores only module-CRUD
  // and cannot represent action-level permissions (Approve Protocol, Release Batch, Sign X, etc.).
  readonly rbacRoles = ['Admin', 'Researcher', 'Investigator', 'QA Analyst', 'Manufacturing Supervisor', 'Supply Chain', 'Regulatory Officer'];

  private readonly roleAliases: Record<string, string> = {
    'admin': 'Admin',
    'researcher': 'Researcher', 'clinicalresearcher': 'Researcher',
    'investigator': 'Investigator', 'principalinvestigator': 'Investigator',
    'qaanalyst': 'QA Analyst', 'qa analyst': 'QA Analyst', 'qualityanalyst': 'QA Analyst',
    'manufacturingsupervisor': 'Manufacturing Supervisor', 'manufacturing supervisor': 'Manufacturing Supervisor',
    'supplychain': 'Supply Chain', 'supply chain': 'Supply Chain', 'supplychainmanager': 'Supply Chain',
    'regulatoryofficer': 'Regulatory Officer', 'regulatory officer': 'Regulatory Officer', 'raofficer': 'Regulatory Officer'
  };

  readonly rbacCatalog: Record<string, { groups: { module: string; perms: string[] }[]; workflow?: string[]; restrictions?: string[] }> = {
    'Admin': {
      groups: [
        { module: 'IAM', perms: ['View Users', 'Create User', 'Edit User', 'Deactivate User', 'Reactivate User', 'Reset Password', 'View Roles', 'Create Role', 'Edit Role', 'View Permissions', 'Create Permission', 'Edit Permission', 'View Products', 'Create Product', 'Edit Product', 'View Sites', 'Create Site', 'Edit Site', 'View Electronic Signatures', 'Verify Signatures'] },
        { module: 'Audit', perms: ['View Audit Dashboard', 'View Audit Events', 'Verify Audit Integrity', 'Export Audit Reports'] }
      ],
      restrictions: ['Cannot Approve Trial Protocols', 'Cannot Review Subjects', 'Cannot Release Batch', 'Cannot Approve CAPA', 'Cannot Approve Regulatory Dossier']
    },
    'Researcher': {
      groups: [
        { module: 'Clinical Trial', perms: ['View Trials', 'Create Trial', 'Edit Trial', 'View Protocols', 'Create Protocol', 'Edit Protocol'] },
        { module: 'Subject Enrollment', perms: ['View Subjects', 'Create Subjects', 'Edit Subjects'] },
        { module: 'Electronic Signature', perms: ['Sign REVIEWED'] }
      ],
      workflow: ['TrialSubject: Enrolled → Reviewed']
    },
    'Investigator': {
      groups: [
        { module: 'Clinical Trial', perms: ['View Trials', 'View Protocols', 'Approve Protocol'] },
        { module: 'Subject Enrollment', perms: ['View Subjects', 'Review Subjects'] },
        { module: 'Electronic Signature', perms: ['Sign APPROVED', 'Sign REVIEWED'] }
      ],
      workflow: ['TrialProtocol: Draft → Approved', 'TrialSubject: Enrolled → Reviewed']
    },
    'QA Analyst': {
      groups: [
        { module: 'Batch Manufacturing', perms: ['View Batch Records', 'View QC Tests', 'Approve QC Results', 'Release Batch'] },
        { module: 'Deviation & CAPA', perms: ['View Deviations', 'Create Deviation', 'View CAPAs', 'Create CAPA', 'Close CAPA'] },
        { module: 'Audit', perms: ['View Module Audit'] },
        { module: 'Electronic Signature', perms: ['Sign RELEASED', 'Sign APPROVED'] }
      ],
      workflow: ['BatchRecord: QCH → Released', 'CAPARecord: Open/InProgress → Closed']
    },
    'Manufacturing Supervisor': {
      groups: [
        { module: 'Batch Manufacturing', perms: ['View Batch Records', 'Create Batch', 'Edit Batch', 'View Raw Materials', 'Edit Raw Materials'] }
      ],
      restrictions: ['Cannot Release Batch', 'Cannot Sign Batch Release']
    },
    'Supply Chain': {
      groups: [
        { module: 'Supply Chain', perms: ['View Shipments', 'Create Shipment', 'Edit Shipment', 'View Inventory', 'Edit Inventory', 'View Cold Chain Logs', 'Ship Product'] }
      ],
      workflow: ['DrugShipment: Dispatched → InTransit'],
      restrictions: ['No Electronic Signature Permissions']
    },
    'Regulatory Officer': {
      groups: [
        { module: 'Regulatory Affairs', perms: ['View Dossiers', 'Create Dossiers', 'Edit Dossiers', 'Approve Dossiers', 'View Milestones', 'Manage Milestones'] },
        { module: 'Electronic Signature', perms: ['Sign APPROVED'] }
      ],
      workflow: ['RegulatoryDossier: UnderReview → Approved']
    }
  };

  private mapToRbacRole(name: string | null | undefined): string | null {
    if (!name) return null;
    const key = name.toString().trim().toLowerCase();
    if (this.roleAliases[key]) return this.roleAliases[key];
    return this.rbacRoles.find(r => r.toLowerCase() === key) || null;
  }

  selectedRbac() {
    const r = this.permRoleName();
    return r ? (this.rbacCatalog[r] || null) : null;
  }

  openPermissionsModal(roleId?: any) {
    this.showPermissionsModal.set(true);
    let roleName: string | null = null;
    if (roleId != null && roleId !== '') {
      const rid = parseInt(roleId, 10);
      const found = this.roles().find(r => r.roleId === rid);
      roleName = this.mapToRbacRole(found?.roleName);
    }
    this.permRoleName.set(roleName || this.rbacRoles[0]);
  }

  selectPermissionRole(roleName: string) {
    this.permRoleName.set(roleName);
  }

  closePermissionsModal() {
    this.showPermissionsModal.set(false);
  }

  permName(p: any): string {
    if (p == null) return '';
    if (typeof p === 'string') return p;
    return p.permissionName || p.name || p.displayName || p.permissionCode || p.code || '';
  }

  // Backend permissions are module-based CRUD ({ module, canCreate, canRead, canUpdate, canDelete }).
  // Flatten each row into readable "Verb Module" labels for the read-only popup.
  permissionLabels(): string[] {
    const labels: string[] = [];
    for (const p of this.rolePermissions()) {
      const module = (p?.module || '').toString().trim();
      if (!module) continue;
      const before = labels.length;
      if (p.canRead) labels.push('View ' + module);
      if (p.canCreate) labels.push('Create ' + module);
      if (p.canUpdate) labels.push('Edit ' + module);
      if (p.canDelete) labels.push('Delete ' + module);
      if (labels.length === before) labels.push('Access ' + module);
    }
    return labels;
  }

  // ── EXPORT USERS (PDF / EXCEL CLIENT INTEGRATION) ──
  exportUsers(format: 'pdf' | 'excel') {
    const list = this.filteredUsers().map(u => ({
      'Name': u.name,
      'Email': u.email,
      'Role': u.role,
      'Site': this.getSiteName(u.siteId),
      'Status': u.status
    }));

    if (format === 'excel') {
      const ws = XLSX.utils.json_to_sheet(list);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, 'PharmaTrack_Users.xlsx');
      this.showSuccess('Users exported to Excel successfully.');
    } else {
      const doc = new jsPDF();
      doc.text('PharmaTrack — Users Administration Report', 14, 15);
      const headers = [['Name', 'Email', 'Role', 'Site', 'Status']];
      const rows = list.map(item => [item.Name, item.Email, item.Role, item.Site, item.Status]);

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 22,
        theme: 'striped',
        headStyles: { fillColor: [206, 82, 0] } // Theme primary CE5200
      });
      doc.save('PharmaTrack_Users.pdf');
      this.showSuccess('Users exported to PDF successfully.');
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

  clearMessages() {
    this.errorMsg.set(null);
    this.successMsg.set(null);
  }
}
