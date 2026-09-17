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
    // ADMIN/PLATFORM_ADMIN only - a plain USER (employee) has no
    // company-wide figures to look at here.
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'PLATFORM_ADMIN'] }
  },
  {
    // PLATFORM_ADMIN only for now - the page itself is just a shell so far
    // (see calendar.ts), narrowed down once there's an actual feature to
    // gate.
    path: 'calendar',
    loadComponent: () => import('./features/calendar/calendar').then(m => m.CalendarPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['PLATFORM_ADMIN'] }
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
        // PLATFORM_ADMIN only, deliberately not (also) ADMIN - user
        // management was centralized there, see user.routes.ts on the
        // backend for why (and how a PLATFORM_ADMIN still manages a given
        // company's users - by impersonating it first).
        path: 'users',
        loadComponent: () => import('./features/admin/user-list/user-list').then(m => m.UserListComponent),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'] }
      },
      {
        path: 'users/new',
        loadComponent: () => import('./features/admin/user-form/user-form').then(m => m.UserForm),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'] }
      },
      {
        // ADMIN and PLATFORM_ADMIN both - not one of the pages centralized
        // to PLATFORM_ADMIN only (unlike users/login-history above), just an
        // ordinary admin-level page.
        path: 'uitest',
        loadComponent: () => import('./features/uitest/uitest').then(m => m.UiTest),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PLATFORM_ADMIN'] }
      },
      {
        // PLATFORM_ADMIN only, deliberately not ADMIN - see
        // login-history.routes.ts on the backend for why.
        path: 'login-history',
        loadComponent: () => import('./features/admin/login-history/login-history').then(m => m.LoginHistoryComponent),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'] }
      },
      {
        // Where a PLATFORM_ADMIN picks which company to act as - see
        // AuthService's own impersonateCompany().
        path: 'companies',
        loadComponent: () => import('./features/admin/company-list/company-list').then(m => m.CompanyListComponent),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'] }
      },
    ]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
