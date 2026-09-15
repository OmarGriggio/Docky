import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../auth/auth.service';

// Layout for the whole /profile section, not just a landing page: this
// component wraps every sub-page (company, users, uitest) via the child
// routes in app.routes.ts, so the menu below stays visible across all of
// them instead of being left behind after the first navigation.
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [Menu, RouterOutlet],
  templateUrl: './profile.html',
})
export class Profile {

  private authService = inject(AuthService);
  private router = inject(Router);

  private isAdmin = this.authService.isAdmin;
  private isPlatformAdmin = this.authService.isPlatformAdmin;

  items = computed<MenuItem[]>(() => {
    const menu: MenuItem[] = [
      { label: 'Entreprise', icon: 'pi pi-building', routerLink: '/profile/company' },
    ];

    // Same page, open to either role now - not one of the pages
    // centralized to PLATFORM_ADMIN only below.
    if (this.isAdmin() || this.isPlatformAdmin()) {
      menu.push({ label: 'UI Kit', icon: 'pi pi-palette', routerLink: '/profile/uitest' });
    }

    // User management was centralized to PLATFORM_ADMIN only (see
    // user.routes.ts on the backend) - an ordinary ADMIN no longer sees
    // these, even for their own company. They manage a company's users by
    // impersonating it first (see "Entreprises" below).
    if (this.isPlatformAdmin()) {
      menu.push(
        { label: 'Entreprises', icon: 'pi pi-sitemap', routerLink: '/profile/companies' },
        { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: '/profile/users' },
        { label: 'Nouvel utilisateur', icon: 'pi pi-user-plus', routerLink: '/profile/users/new' },
        { label: 'Historique des connexions', icon: 'pi pi-history', routerLink: '/profile/login-history' },
      );
    }

    menu.push({ label: 'Déconnexion', icon: 'pi pi-sign-out', command: () => this.logout() });

    return menu;
  });

  private logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

}
