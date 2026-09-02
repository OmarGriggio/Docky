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
    path: 'uitest',
    loadComponent: () => import('./features/uitest/uitest').then(m => m.UiTest),
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN']
    }
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
    path: 'documents/:id',
    loadComponent: () => import('./features/documents/document-detail/document-detail').then(m => m.DocumentDetail),
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
    path: 'profile',
    loadComponent: () => import('./features/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./features/admin/user-list/user-list').then(m => m.UserListComponent),
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN']
    }
  },
  {
    path: 'admin/users/new',
    loadComponent: () => import('./features/admin/user-form/user-form').then(m => m.UserForm),
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN']
    }
  },
  {
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  }
];
