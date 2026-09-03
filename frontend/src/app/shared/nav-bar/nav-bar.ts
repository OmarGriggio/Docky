import { Component, computed, inject } from '@angular/core';
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
  private router = inject(Router);

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
        { label: "Main d'oeuvre", path: '/resources', queryParams: { type: 'LABOR' } },
        { label: 'Sous-traitance', path: '/resources', queryParams: { type: 'SUBCONTRACTING' } },
        { label: 'Divers', path: '/resources', queryParams: { type: 'OTHER' } }
      ]
    },
    {
      label: 'Chantiers',
      links: [
        { label: 'Liste', path: '/projects' }
      ]
    },
    {
      label: 'Profil',
      links: [
        { label: 'Mon entreprise', path: '/profile' }
      ]
    },
    {
      label: 'UI Kit',
      links: [
        { label: 'Exemples', path: '/uitest' }
      ],
      roles: ['ADMIN']
    },
    {
      label: 'Admin',
      links: [
        { label: 'Utilisateurs', path: '/admin/users' },
        { label: 'Nouvel utilisateur', path: '/admin/users/new' }
      ],
      roles: ['ADMIN']
    }
  ];

  visibleNavItems = computed(() => {
    const role = this.currentUser()?.role;
    return this.navItems.filter(item => !item.roles || (role && item.roles.includes(role)));
  });

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}
