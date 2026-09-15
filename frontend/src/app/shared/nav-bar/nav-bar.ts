import { Component, computed, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { UserRole } from '../models/auth';

interface NavLink {
  label: string;
  path: string;
  queryParams?: Record<string, string>;
}

interface NavItem {
  label: string;
  icon: string;
  links: NavLink[];
  roles?: UserRole[];
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar {

  private authService = inject(AuthService);
  private location = inject(Location);
  private router = inject(Router);

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  isImpersonating = this.authService.isImpersonating;

  // Lands back on the company picker rather than wherever the impersonated
  // view happened to be - that page wouldn't mean anything once back on the
  // platform admin's own company/token.
  returnToPlatformView(): void {
    this.authService.returnToPlatformView();
    this.router.navigate(['/profile/companies']);
  }

  // One global "Retour" in the nav-bar (itself present on every page,
  // being part of the app shell - see app.ts) rather than a button
  // repeated on each individual page template. Plain browser-history back,
  // not a fixed route - it goes wherever the user actually came from.
  goBack(): void {
    this.location.back();
  }

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      icon: 'pi pi-home',
      links: [
        { label: 'Dashboard', path: '/dashboard' }
      ]
    },
    {
      label: 'Clients',
      icon: 'pi pi-address-book',
      links: [
        { label: 'Liste', path: '/clients' }
      ]
    },
    {
      label: 'Documents',
      icon: 'pi pi-receipt',
      links: [
        { label: 'Offres', path: '/documents', queryParams: { type: 'QUOTE' } },
        { label: 'Factures', path: '/documents', queryParams: { type: 'INVOICE' } }
      ]
    },
    {
      label: 'Ressources',
      icon: 'pi pi-box',
      links: [
        { label: 'Matériel', path: '/resources', queryParams: { type: 'MATERIAL' } },
        { label: 'Service', path: '/resources', queryParams: { type: 'SERVICE' } }
      ]
    },
    {
      label: 'Chantiers',
      icon: 'pi pi-hammer',
      links: [
        { label: 'Liste', path: '/projects' }
      ]
    }
  ];

  visibleNavItems = computed(() => {
    const role = this.currentUser()?.role;
    return this.navItems.filter(item => !item.roles || (role && item.roles.includes(role)));
  });

}
