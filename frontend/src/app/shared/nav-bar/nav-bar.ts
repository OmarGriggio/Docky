import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../features/auth/auth.service';
import { UserRole } from '../models/auth';

interface NavLink {
  label: string;
  path: string;
  queryParams?: Record<string, string>;
}

interface NavItem {
  label: string;
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

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;

  navItems: NavItem[] = [
    {
      label: 'Dashboard',
      links: [
        { label: 'Dashboard', path: '/dashboard' }
      ]
    },
    {
      label: 'Clients',
      links: [
        { label: 'Liste', path: '/clients' }
      ]
    },
    {
      label: 'Fournisseurs',
      links: [
        { label: 'Liste', path: '/suppliers' }
      ]
    },
    {
      label: 'Documents',
      links: [
        { label: 'Offres', path: '/documents', queryParams: { type: 'QUOTE' } },
        { label: 'Factures', path: '/documents', queryParams: { type: 'INVOICE' } }
      ]
    },
    {
      label: 'Ressources',
      links: [
        { label: 'Matériel', path: '/resources', queryParams: { type: 'MATERIAL' } },
        { label: 'Service', path: '/resources', queryParams: { type: 'SERVICE' } }
      ]
    },
    {
      label: 'Chantiers',
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
