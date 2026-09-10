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

  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;

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
      label: 'Fournisseurs',
      icon: 'pi pi-truck',
      links: [
        { label: 'Liste', path: '/suppliers' }
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
