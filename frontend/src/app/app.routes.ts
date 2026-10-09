import { Routes } from '@angular/router';
import { roleGuard } from './features/auth/role.guard';
import { authGuard } from './features/auth/auth.guard';
import { MenuItem } from 'primeng/api';
import { RouteBreadcrumb } from './shared/header/header';

// Every `label` below is a Transloco key, not display text - see
// header.ts's own comment on RouteBreadcrumb for why.

// Same route for a fresh document, a duplicate or an invoice created from a
// chantier (?type=QUOTE|INVOICE, see document-list.ts / project-list.ts).
const newDocumentBreadcrumb: RouteBreadcrumb = route => [
  { label: 'nav.documents', routerLink: '/documents', queryParams: { type: route.queryParamMap.get('type') } },
  { label: route.queryParamMap.get('type') === 'INVOICE' ? 'documents.form.newInvoice' : 'documents.form.newQuote' },
];

// Documents/Ressources are each one route split by ?type= (see nav-bar.ts) -
// their trail names the section, then that type.
const typedList = (section: string, labels: Record<string, string>): RouteBreadcrumb => route => {
  const label = labels[route.queryParamMap.get('type') ?? ''];
  return label ? [{ label: section }, { label }] : [{ label: section }];
};

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
    data: { roles: ['ADMIN', 'PLATFORM_ADMIN'], breadcrumb: 'nav.dashboard' }
  },
  {
    // ADMIN/PLATFORM_ADMIN, same as dashboard above - a plain USER
    // (employee) doesn't plan chantiers.
    path: 'calendar',
    loadComponent: () => import('./features/calendar/calendar').then(m => m.CalendarPage),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'PLATFORM_ADMIN'], breadcrumb: 'nav.calendar' }
  },
  {
    path: 'clients',
    loadComponent: () => import('./features/clients/client-list/client-list').then(m => m.ClientListComponent),
    canActivate: [authGuard],
    data: { breadcrumb: 'nav.clients' }
  },
  {
    path: 'clients/:id',
    loadComponent: () => import('./features/clients/client-detail/client-detail').then(m => m.ClientDetail),
    canActivate: [authGuard],
    data: { breadcrumb: (): MenuItem[] => [{ label: 'nav.clients', routerLink: '/clients' }, { label: 'clients.sheet' }] }
  },
  {
    path: 'documents',
    loadComponent: () => import('./features/documents/document-list/document-list').then(m => m.DocumentListComponent),
    canActivate: [authGuard],
    data: { breadcrumb: typedList('nav.documents', { QUOTE: 'nav.quotes', INVOICE: 'nav.invoices' }) }
  },
  {
    // Must come before documents/:id, or ":id" would greedily match "new".
    path: 'documents/new',
    loadComponent: () => import('./features/documents/document-form/document-form').then(m => m.DocumentForm),
    canActivate: [authGuard],
    data: { breadcrumb: newDocumentBreadcrumb }
  },
  {
    // No more read-only detail page - editing IS the detail page now (see
    // document-form.ts's loadForEdit).
    path: 'documents/:id',
    loadComponent: () => import('./features/documents/document-form/document-form').then(m => m.DocumentForm),
    canActivate: [authGuard],
    data: { breadcrumb: (): MenuItem[] => [{ label: 'nav.documents', routerLink: '/documents' }, { label: 'documents.modify' }] }
  },
  {
    path: 'resources',
    loadComponent: () => import('./features/resources/resource-list/resource-list').then(m => m.ResourceListComponent),
    canActivate: [authGuard],
    data: { breadcrumb: typedList('nav.resources', { MATERIAL: 'nav.material', SERVICE: 'nav.service' }) }
  },
  {
    path: 'projects',
    loadComponent: () => import('./features/projects/project-list/project-list').then(m => m.ProjectListComponent),
    canActivate: [authGuard],
    data: { breadcrumb: 'nav.projects' }
  },
  {
    path: 'projects/:id',
    loadComponent: () => import('./features/projects/project-detail/project-detail').then(m => m.ProjectDetail),
    canActivate: [authGuard],
    data: { breadcrumb: (): MenuItem[] => [{ label: 'nav.projects', routerLink: '/projects' }, { label: 'projects.sheet' }] }
  },
  {
    // The company's own data form ("Mon entreprise") - opened from the
    // account popup's "Profil" (see nav-bar.html). Everything else that used
    // to live under /profile is under /settings now.
    path: 'profile',
    loadComponent: () => import('./features/profile/company-profile/company-profile').then(m => m.CompanyProfile),
    canActivate: [authGuard],
    data: { breadcrumb: 'nav.profile' }
  },
  {
    // Layout for the whole section (router-outlet + a persistent side menu,
    // see settings.html) - every child below renders inside it, so the menu
    // never disappears when navigating between them. '' redirects to
    // 'templates' so /settings itself lands on Modèles de documents directly.
    path: 'settings',
    loadComponent: () => import('./features/settings/settings').then(m => m.Settings),
    canActivate: [authGuard],
    data: { breadcrumb: 'nav.settings' },
    children: [
      { path: '', redirectTo: 'templates', pathMatch: 'full' },
      {
        path: 'templates',
        loadComponent: () => import('./features/settings/document-templates/document-templates').then(m => m.DocumentTemplates),
        data: { breadcrumb: 'settings.documentTemplates' }
      },
      {
        // Open to every role, like 'templates' above - a personal
        // preference (users.language), not company/admin-scoped.
        path: 'language',
        loadComponent: () => import('./features/settings/language/language').then(m => m.Language),
        data: { breadcrumb: 'settings.language' }
      },
      {
        // PLATFORM_ADMIN only, deliberately not (also) ADMIN - user
        // management was centralized there, see user.routes.ts on the
        // backend for why (and how a PLATFORM_ADMIN still manages a given
        // company's users - by impersonating it first).
        path: 'users',
        loadComponent: () => import('./features/admin/user-list/user-list').then(m => m.UserListComponent),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'], breadcrumb: 'settings.users' }
      },
      {
        path: 'users/new',
        loadComponent: () => import('./features/admin/user-form/user-form').then(m => m.UserForm),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'], breadcrumb: (): MenuItem[] => [{ label: 'settings.users', routerLink: '/settings/users' }, { label: 'settings.newUser' }] }
      },
      {
        // ADMIN and PLATFORM_ADMIN both - not one of the pages centralized
        // to PLATFORM_ADMIN only (unlike users/login-history above), just an
        // ordinary admin-level page.
        path: 'uitest',
        loadComponent: () => import('./features/uitest/uitest').then(m => m.UiTest),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PLATFORM_ADMIN'], breadcrumb: 'settings.uiKit' }
      },
      {
        // PLATFORM_ADMIN only, deliberately not ADMIN - see
        // login-history.routes.ts on the backend for why.
        path: 'login-history',
        loadComponent: () => import('./features/admin/login-history/login-history').then(m => m.LoginHistoryComponent),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'], breadcrumb: 'settings.loginHistoryBreadcrumb' }
      },
      {
        // Where a PLATFORM_ADMIN picks which company to act as - see
        // AuthService's own impersonateCompany().
        path: 'companies',
        loadComponent: () => import('./features/admin/company-list/company-list').then(m => m.CompanyListComponent),
        canActivate: [roleGuard],
        data: { roles: ['PLATFORM_ADMIN'], breadcrumb: 'settings.companies' }
      },
    ]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
