import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: LoginComponent },
  { path: 'reset-password', component: LoginComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'users', loadComponent: () => import('./components/admin/users/users.component').then(m => m.UsersComponent), data: { module: 'Users' } },
      { path: 'signatures', loadComponent: () => import('./components/admin/signatures/signatures.component').then(m => m.SignaturesComponent), data: { module: 'Electronic Signatures' } },
      { path: 'products', loadComponent: () => import('./components/admin/products/products.component').then(m => m.ProductsComponent), data: { module: 'Products' } },
      { path: 'sites', loadComponent: () => import('./components/admin/sites/sites.component').then(m => m.SitesComponent), data: { module: 'Sites' } },
      { path: 'audit', loadComponent: () => import('./components/audit/audit.component').then(m => m.AuditComponent), data: { module: 'Audit' } },
      { path: 'trials', loadComponent: () => import('./components/trials/trials.component').then(m => m.TrialsComponent), data: { module: 'Clinical Trials' } },
      { path: 'subjects', loadComponent: () => import('./components/subjects/subjects.component').then(m => m.SubjectsComponent), data: { module: 'Subjects' } },
      { path: 'batches', loadComponent: () => import('./components/batches/batches.component').then(m => m.BatchesComponent), data: { module: 'Batch Manufacturing' } },
      { path: 'deviations', loadComponent: () => import('./components/deviations/deviations.component').then(m => m.DeviationsComponent), data: { module: 'Deviation & CAPA' } },
      { path: 'regulatory', loadComponent: () => import('./components/regulatory/regulatory.component').then(m => m.RegulatoryComponent), data: { module: 'Regulatory Affairs' } },
      { path: 'supply-chain', loadComponent: () => import('./components/supply-chain/supply-chain.component').then(m => m.SupplyChainComponent), data: { module: 'Supply Chain' } },
      { path: 'notifications', loadComponent: () => import('./components/notifications/notifications.component').then(m => m.NotificationsComponent) }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
