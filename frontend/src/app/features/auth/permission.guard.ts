import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { AccessLevel, PermissionModule, PermissionService } from '../../shared/services/permission.service';

// The pages an employee may land on, in the order they're tried when one
// isn't allowed - the first one they can read.
const LANDING_PAGES: { module: PermissionModule; path: string; queryParams?: Record<string, string> }[] = [
  { module: 'dashboard', path: '/dashboard' },
  { module: 'calendar', path: '/calendar' },
  { module: 'projects', path: '/projects' },
  { module: 'quotes', path: '/documents', queryParams: { type: 'QUOTE' } },
  { module: 'invoices', path: '/documents', queryParams: { type: 'INVOICE' } },
  { module: 'clients', path: '/clients' },
  { module: 'catalog', path: '/resources' },
];

const firstAllowedPage = (permissions: PermissionService, router: Router): UrlTree => {
  const page = LANDING_PAGES.find(candidate => permissions.can(candidate.module));
  // Nothing at all: the settings, open to everyone (the language).
  return page ? router.createUrlTree([page.path], { queryParams: page.queryParams }) : router.createUrlTree(['/settings/language']);
};

// A quote or invoice page's module comes from its ?type= - either for a
// document opened by its id (its type isn't known before it's loaded).
const modulesOf = (route: ActivatedRouteSnapshot): PermissionModule[] => {
  const modules = route.data['permission'] as PermissionModule[] | 'documents';
  if (modules !== 'documents') {
    return modules;
  }
  const type = route.queryParamMap.get('type');
  return type === 'QUOTE' ? ['quotes'] : type === 'INVOICE' ? ['invoices'] : ['quotes', 'invoices'];
};

// After authGuard: route data `permission` (the modules, any one of them
// enough, or 'documents') and `permissionLevel` (READ by default). An
// employee without it lands on the first page they can read instead.
// Anyone else always passes - see PermissionService.
export const permissionGuard: CanActivateFn = async route => {
  const permissions = inject(PermissionService);
  const router = inject(Router);
  await permissions.ready();

  const level = (route.data['permissionLevel'] as AccessLevel | undefined) ?? 'READ';
  if (modulesOf(route).some(module => permissions.can(module, level))) {
    return true;
  }
  return firstAllowedPage(permissions, router);
};
