import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-container">
      <!-- Title & Action -->
      <div class="admin-header">
        <div>
          <h2>Administration Control Panel</h2>
          <p>Configure and manage users, products, sites, and mappings.</p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-primary" *ngIf="activeTab() === 'users'" (click)="openCreateUserModal()">
            +Create User
          </button>
          <button class="btn btn-primary" *ngIf="activeTab() === 'products'" (click)="openCreateProductModal()">
            +Create Product
          </button>
          <button class="btn btn-primary" *ngIf="activeTab() === 'sites'" (click)="openCreateSiteModal()">
            +Create Site
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs-nav">
        <button [class.active]="activeTab() === 'users'" (click)="activeTab.set('users')">Users Management</button>
        <button [class.active]="activeTab() === 'products'" (click)="activeTab.set('products')">Product Profiles</button>
        <button [class.active]="activeTab() === 'sites'" (click)="activeTab.set('sites')">Site Directories</button>
      </div>

      <div class="alert alert-error" *ngIf="errorMsg()">{{ errorMsg() }}</div>
      <div class="alert alert-success" *ngIf="successMsg()">{{ successMsg() }}</div>

      <!-- 1. USERS TAB -->
      <div class="tab-content" *ngIf="activeTab() === 'users'">
        <!-- Filter bar -->
        <div class="filter-bar">
          <div class="filter-group">
            <label>🔽 Filter by Status</label>
            <select [(ngModel)]="statusFilter" (change)="applyFilters()">
              <option value="All">All</option>
              <option value="Active">Active</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>
          <div class="export-group">
            <button class="btn btn-secondary" (click)="exportUsers('pdf')">Export PDF</button>
            <button class="btn btn-secondary" (click)="exportUsers('excel')">Export Excel</button>
          </div>
        </div>

        <!-- Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Site Name</th>
                <th>Status</th>
                <th style="width: 120px;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of paginatedUsers()">
                <td style="font-weight: 600;">{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td><span class="role-pill">{{ user.role }}</span></td>
                <td>{{ getSiteName(user.siteId) }}</td>
                <td>
                  <span class="status-indicator" [class.status-active]="user.status === 'Active'" [class.status-inactive]="user.status !== 'Active'">
                    {{ user.status }}
                  </span>
                </td>
                <td>
                  <!-- Custom Dropdown Action Menu -->
                  <div class="actions-menu-wrap">
                    <button class="action-trigger" (click)="toggleActionDropdown(user.userId)">
                      ⚙️ Actions
                    </button>
                    <div class="action-dropdown" *ngIf="openedActionUser() === user.userId">
                      <button (click)="viewUser(user)">View</button>
                      <button (click)="openEditUserModal(user)">Edit</button>
                      <button *ngIf="user.status === 'Active'" (click)="deactivateUser(user.userId)">Deactivate</button>
                      <button *ngIf="user.status !== 'Active'" (click)="reactivateUser(user.userId)">Reactivate</button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr *ngIf="filteredUsers().length === 0">
                <td colspan="6" class="empty-state">No users registered matching filter parameters.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="filteredUsers().length > 0">
          <button [disabled]="userPage() === 1" (click)="userPage.set(userPage() - 1)">Previous</button>
          <span>Page {{ userPage() }} of {{ userTotalPages() }}</span>
          <button [disabled]="userPage() === userTotalPages()" (click)="userPage.set(userPage() + 1)">Next</button>
        </div>
      </div>

      <!-- 2. PRODUCTS TAB -->
      <div class="tab-content" *ngIf="activeTab() === 'products'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Storage Condition</th>
                <th>Min Temp Limit</th>
                <th>Max Temp Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let prod of paginatedProducts()">
                <td style="font-weight: 600;">{{ prod.productName }}</td>
                <td>{{ prod.storageCondition }}</td>
                <td>{{ prod.minThreshold }} °C</td>
                <td>{{ prod.maxThreshold }} °C</td>
              </tr>
              <tr *ngIf="products().length === 0">
                <td colspan="4" class="empty-state">No products registered.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="products().length > 0">
          <button [disabled]="productPage() === 1" (click)="productPage.set(productPage() - 1)">Previous</button>
          <span>Page {{ productPage() }} of {{ productTotalPages() }}</span>
          <button [disabled]="productPage() === productTotalPages()" (click)="productPage.set(productPage() + 1)">Next</button>
        </div>
      </div>

      <!-- 3. SITES TAB -->
      <div class="tab-content" *ngIf="activeTab() === 'sites'">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Site Name</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let site of paginatedSites()">
                <td style="font-weight: 600;">{{ site.siteName }}</td>
                <td>{{ site.country }}</td>
              </tr>
              <tr *ngIf="sites().length === 0">
                <td colspan="2" class="empty-state">No sites registered.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pagination" *ngIf="sites().length > 0">
          <button [disabled]="sitePage() === 1" (click)="sitePage.set(sitePage() - 1)">Previous</button>
          <span>Page {{ sitePage() }} of {{ siteTotalPages() }}</span>
          <button [disabled]="sitePage() === siteTotalPages()" (click)="sitePage.set(sitePage() + 1)">Next</button>
        </div>
      </div>

      <!-- ── MODALS (POPUPS WITH NO UNNECESSARY SCROLLING) ── -->

      <!-- A. CREATE USER MODAL -->
      <div class="modal-overlay" *ngIf="showCreateUserModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create New User Profile</h3>
            <button class="close-modal" (click)="showCreateUserModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateUser()">
            <div class="field">
              <label>Name (Characters: {{ createUserForm.name.length }} / 100)</label>
              <input type="text" name="name" [(ngModel)]="createUserForm.name" maxlength="100" placeholder="Signer/Staff Name" required>
            </div>
            <div class="field">
              <label>Email Address</label>
              <input type="email" name="email" [(ngModel)]="createUserForm.email" placeholder="staff@pharmatrack.com" required>
            </div>
            <div class="field">
              <label>Password</label>
              <input type="password" name="password" [(ngModel)]="createUserForm.password" placeholder="Create secure password" required>
            </div>
            <div class="form-row">
              <div class="field">
                <label>User Role</label>
                <select name="roleId" [(ngModel)]="createUserForm.roleId" required>
                  <option *ngFor="let role of roles()" [value]="role.roleId">{{ role.roleName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Assign Site</label>
                <select name="siteId" [(ngModel)]="createUserForm.siteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Phone Number (10 digits)</label>
              <div class="phone-wrap">
                <select name="countryCode" [(ngModel)]="createUserForm.countryCode" style="width: 90px; margin-right: 8px;">
                  <option value="+1">+1 (US)</option>
                  <option value="+91">+91 (IN)</option>
                  <option value="+44">+44 (UK)</option>
                </select>
                <input type="text" name="phone" [(ngModel)]="createUserForm.phone" placeholder="9876543210" pattern="[0-9]{10}" required style="flex-grow: 1;">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateUserModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Save User</button>
            </div>
          </form>
        </div>
      </div>

      <!-- B. EDIT USER MODAL -->
      <div class="modal-overlay" *ngIf="showEditUserModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>Edit User Profile</h3>
            <button class="close-modal" (click)="showEditUserModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleEditUser()">
            <div class="field">
              <label>Name</label>
              <input type="text" name="editName" [(ngModel)]="editUserForm.name" maxlength="100" required>
            </div>
            <div class="form-row">
              <div class="field">
                <label>User Role</label>
                <select name="editRoleId" [(ngModel)]="editUserForm.roleId" required>
                  <option *ngFor="let role of roles()" [value]="role.roleId">{{ role.roleName }}</option>
                </select>
              </div>
              <div class="field">
                <label>Assign Site</label>
                <select name="editSiteId" [(ngModel)]="editUserForm.siteId" required>
                  <option *ngFor="let s of sites()" [value]="s.siteId">{{ s.siteName }}</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showEditUserModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Update Profile</button>
            </div>
          </form>
        </div>
      </div>

      <!-- C. CREATE PRODUCT MODAL -->
      <div class="modal-overlay" *ngIf="showCreateProductModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create New Product Profile</h3>
            <button class="close-modal" (click)="showCreateProductModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateProduct()">
            <div class="field">
              <label>Product Name</label>
              <input type="text" name="prodName" [(ngModel)]="createProductForm.productName" placeholder="e.g. Vaccine-BatchA" required>
            </div>
            <div class="field">
              <label>Storage Condition</label>
              <input type="text" name="storage" [(ngModel)]="createProductForm.storageCondition" placeholder="e.g. Keep frozen -20°C" required>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Min Threshold (°C)</label>
                <input type="number" step="0.1" name="minT" [(ngModel)]="createProductForm.minThreshold" required>
              </div>
              <div class="field">
                <label>Max Threshold (°C)</label>
                <input type="number" step="0.1" name="maxT" [(ngModel)]="createProductForm.maxThreshold" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateProductModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Product</button>
            </div>
          </form>
        </div>
      </div>

      <!-- D. CREATE SITE MODAL -->
      <div class="modal-overlay" *ngIf="showCreateSiteModal()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>+Create New Site Directory</h3>
            <button class="close-modal" (click)="showCreateSiteModal.set(false)">×</button>
          </div>
          <form (ngSubmit)="handleCreateSite()">
            <div class="field">
              <label>Site Name</label>
              <input type="text" name="siteName" [(ngModel)]="createSiteForm.siteName" placeholder="e.g. Boston Research Site" required>
            </div>
            <div class="field">
              <label>Country</label>
              <input type="text" name="country" [(ngModel)]="createSiteForm.country" placeholder="e.g. United States" required>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="showCreateSiteModal.set(false)">Cancel</button>
              <button type="submit" class="btn btn-primary">Create Site</button>
            </div>
          </form>
        </div>
      </div>

      <!-- E. VIEW USER DETAILS MODAL -->
      <div class="modal-overlay" *ngIf="selectedUser()">
        <div class="modal-card">
          <div class="modal-header">
            <h3>View User Profile Details</h3>
            <button class="close-modal" (click)="selectedUser.set(null)">×</button>
          </div>
          <div class="details-pane">
            <div class="detail-item"><span class="label">User Name:</span> {{ selectedUser().name }}</div>
            <div class="detail-item"><span class="label">Email Address:</span> {{ selectedUser().email }}</div>
            <div class="detail-item"><span class="label">Assigned Role:</span> {{ selectedUser().role }}</div>
            <div class="detail-item"><span class="label">Phone:</span> {{ selectedUser().phone }}</div>
            <div class="detail-item"><span class="label">Site Assigned:</span> {{ getSiteName(selectedUser().siteId) }}</div>
            <div class="detail-item"><span class="label">Status:</span> {{ selectedUser().status }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="selectedUser.set(null)">Close</button>
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
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
    .role-pill {
      background: #e8f1fa;
      color: #1d5f9e;
      padding: 3px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
    }
    .status-indicator {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-active {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .status-inactive {
      background: #fbeceb;
      color: #b3261e;
    }
    .actions-menu-wrap {
      position: relative;
      display: inline-block;
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
    .action-dropdown {
      position: absolute;
      right: 0;
      top: 100%;
      background: #ffffff;
      border: 1px solid #ece4dc;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 10;
      display: flex;
      flex-direction: column;
      width: 140px;
      margin-top: 4px;
    }
    .action-dropdown button {
      background: none;
      border: none;
      padding: 10px 14px;
      text-align: left;
      cursor: pointer;
      font-size: 13.5px;
      color: #211611;
      width: 100%;
    }
    .action-dropdown button:hover {
      background: #fbe9de;
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
      overflow: hidden; /* Avoid scrollbars */
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
    .phone-wrap {
      display: flex;
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
    .empty-state {
      text-align: center;
      color: #7a6a5e;
      font-style: italic;
      padding: 24px !important;
    }
  `]
})
export class UsersComponent implements OnInit {
  private apiService = inject(ApiService);

  activeTab = signal<'users' | 'products' | 'sites'>('users');
  errorMsg = signal<string | null>(null);
  successMsg = signal<string | null>(null);

  // Data arrays
  users = signal<any[]>([]);
  products = signal<any[]>([]);
  sites = signal<any[]>([]);
  roles = signal<any[]>([]);

  // Filter params
  statusFilter = 'All';
  filteredUsers = signal<any[]>([]);

  // Dropdown helper
  openedActionUser = signal<number | null>(null);

  // Pagination states (all pagination supported)
  userPage = signal<number>(1);
  pageSize = 8;
  userTotalPages = signal<number>(1);

  productPage = signal<number>(1);
  productTotalPages = signal<number>(1);

  sitePage = signal<number>(1);
  siteTotalPages = signal<number>(1);

  // Modals Visibility
  showCreateUserModal = signal<boolean>(false);
  showEditUserModal = signal<boolean>(false);
  showCreateProductModal = signal<boolean>(false);
  showCreateSiteModal = signal<boolean>(false);
  selectedUser = signal<any>(null);

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
    siteId: null as any
  };

  createProductForm = {
    productName: '',
    storageCondition: '',
    minThreshold: 0,
    maxThreshold: 0
  };

  createSiteForm = {
    siteName: '',
    country: ''
  };

  ngOnInit() {
    this.fetchSites();
    this.fetchProducts();
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
          this.siteTotalPages.set(Math.ceil(this.sites().length / this.pageSize));
        }
      }
    });
  }

  fetchProducts() {
    this.apiService.getProducts().subscribe({
      next: (res) => {
        if (res.success) {
          this.products.set(res.data || []);
          this.productTotalPages.set(Math.ceil(this.products().length / this.pageSize));
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
    if (this.statusFilter === 'Active') {
      result = result.filter(u => u.status === 'Active');
    } else if (this.statusFilter === 'Deactivated') {
      result = result.filter(u => u.status === 'Inactive' || u.status === 'Deactivated');
    }

    this.filteredUsers.set(result);
    this.userPage.set(1);
    this.userTotalPages.set(Math.ceil(result.length / this.pageSize) || 1);
  }

  paginatedUsers() {
    const start = (this.userPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  }

  paginatedProducts() {
    const start = (this.productPage() - 1) * this.pageSize;
    return this.products().slice(start, start + this.pageSize);
  }

  paginatedSites() {
    const start = (this.sitePage() - 1) * this.pageSize;
    return this.sites().slice(start, start + this.pageSize);
  }

  getSiteName(siteId: number): string {
    const site = this.sites().find(s => s.siteId === siteId);
    return site ? site.siteName : 'None';
  }

  toggleActionDropdown(userId: number) {
    if (this.openedActionUser() === userId) {
      this.openedActionUser.set(null);
    } else {
      this.openedActionUser.set(userId);
    }
  }

  viewUser(user: any) {
    this.selectedUser.set(user);
    this.openedActionUser.set(null);
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
    this.showCreateUserModal.set(true);
    this.clearMessages();
  }

  handleCreateUser() {
    if (!this.createUserForm.phone || this.createUserForm.phone.length !== 10) {
      this.showError('Phone number must be exactly 10 digits.');
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
    this.editUserForm = {
      userId: user.userId,
      name: user.name,
      roleId: this.roles().find(r => r.roleName === user.role)?.roleId || null,
      siteId: user.siteId
    };
    this.showEditUserModal.set(true);
    this.openedActionUser.set(null);
    this.clearMessages();
  }

  handleEditUser() {
    const payload = {
      name: this.editUserForm.name,
      roleId: parseInt(this.editUserForm.roleId, 10),
      siteId: parseInt(this.editUserForm.siteId, 10)
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

  reactivateUser(userId: number) {
    this.openedActionUser.set(null);
    // Reactivate user by updating status back to 'Active'
    this.apiService.unlockUser(userId, { status: 'Active', reason: 'Reactivation from admin panel' }).subscribe({
      next: () => {
        this.showSuccess('User account reactivated successfully.');
        this.fetchUsers();
      },
      error: (err) => this.showError(err.error?.message || 'Reactivation failed.')
    });
  }

  openCreateProductModal() {
    this.createProductForm = {
      productName: '',
      storageCondition: '',
      minThreshold: 2.0,
      maxThreshold: 8.0
    };
    this.showCreateProductModal.set(true);
    this.clearMessages();
  }

  handleCreateProduct() {
    this.apiService.createProduct(this.createProductForm).subscribe({
      next: () => {
        this.showSuccess('Product profile created successfully.');
        this.showCreateProductModal.set(false);
        this.fetchProducts();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to create product.')
    });
  }

  openCreateSiteModal() {
    this.createSiteForm = {
      siteName: '',
      country: ''
    };
    this.showCreateSiteModal.set(true);
    this.clearMessages();
  }

  handleCreateSite() {
    this.apiService.createSite(this.createSiteForm).subscribe({
      next: () => {
        this.showSuccess('Site directory created successfully.');
        this.showCreateSiteModal.set(false);
        this.fetchSites();
      },
      error: (err) => this.showError(err.error?.message || 'Failed to create site.')
    });
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

      (doc as any).autoTable({
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
