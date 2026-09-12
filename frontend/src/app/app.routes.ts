import { Routes } from '@angular/router';
import { roleGuard } from './features/auth/role.guard';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register').then(m => m.Register)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
  },
  {
    path: 'clients',
    loadComponent: () => import('./features/clients/client-list/client-list').then(m => m.ClientListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'clients/:id',
    loadComponent: () => import('./features/clients/client-detail/client-detail').then(m => m.ClientDetail),
    canActivate: [authGuard]
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./features/suppliers/supplier-list/supplier-list').then(m => m.SupplierListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'suppliers/:id',
    loadComponent: () => import('./features/suppliers/supplier-detail/supplier-detail').then(m => m.SupplierDetail),
    canActivate: [authGuard]
  },
  {
    path: 'documents',
    loadComponent: () => import('./features/documents/document-list/document-list').then(m => m.DocumentListComponent),
    canActivate: [authGuard]
  },
  {
    // Must come before documents/:id, or ":id" would greedily match "new".
    path: 'documents/new',
    loadComponent: () => import('./features/documents/document-form/document-form').then(m => m.DocumentForm),
    canActivate: [authGuard]
  },
  {
    // No more read-only detail page - editing IS the detail page now (see
    // document-form.ts's loadForEdit).
    path: 'documents/:id',
    loadComponent: () => import('./features/documents/document-form/document-form').then(m => m.DocumentForm),
    canActivate: [authGuard]
  },
  {
    path: 'resources',
    loadComponent: () => import('./features/resources/resource-list/resource-list').then(m => m.ResourceListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/project-list/project-list').then(m => m.ProjectListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./features/projects/project-detail/project-detail').then(m => m.ProjectDetail),
    canActivate: [authGuard]
  },
  {
    // Layout for the whole section (router-outlet + a persistent side menu,
    // see profile.html) - every child below renders inside it, so the menu
    // never disappears when navigating between them. '' redirects to
    // 'company' so /profile itself lands on Entreprise directly.
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then(m => m.Profile),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'company', pathMatch: 'full' },
      {
        path: 'company',
        loadComponent: () => import('./features/profile/company-profile/company-profile').then(m => m.CompanyProfile)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/user-list/user-list').then(m => m.UserListComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'users/new',
        loadComponent: () => import('./features/admin/user-form/user-form').then(m => m.UserForm),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'uitest',
        loadComponent: () => import('./features/uitest/uitest').then(m => m.UiTest),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
    ]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
