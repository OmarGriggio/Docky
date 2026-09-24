import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../auth/auth.service';

// Layout for the whole /settings section, not just a landing page: this
// component wraps every sub-page (templates, users, uitest...) via the child
// routes in app.routes.ts, so the menu below stays visible across all of
// them instead of being left behind after the first navigation. The
// company's own data form ("Profil") is a separate page, /profile - see
// nav-bar.html's account popup for how the two are reached.
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [Menu, RouterOutlet],
  templateUrl: './settings.html',
})
export class Settings {

  private authService = inject(AuthService);

  private isAdmin = this.authService.isAdmin;
  private isPlatformAdmin = this.authService.isPlatformAdmin;

  items = computed<MenuItem[]>(() => {
    const menu: MenuItem[] = [
      { label: 'Modèles de documents', icon: 'pi pi-file-edit', routerLink: '/settings/templates' },
    ];

    // Same page, open to either role now - not one of the pages
    // centralized to PLATFORM_ADMIN only below.
    if (this.isAdmin() || this.isPlatformAdmin()) {
      menu.push({ label: 'UI Kit', icon: 'pi pi-palette', routerLink: '/settings/uitest' });
    }

    // User management was centralized to PLATFORM_ADMIN only (see
    // user.routes.ts on the backend) - an ordinary ADMIN no longer sees
    // these, even for their own company. They manage a company's users by
    // impersonating it first (see "Entreprises" below).
    if (this.isPlatformAdmin()) {
      menu.push(
        { label: 'Entreprises', icon: 'pi pi-sitemap', routerLink: '/settings/companies' },
        { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: '/settings/users' },
        { label: 'Nouvel utilisateur', icon: 'pi pi-user-plus', routerLink: '/settings/users/new' },
        { label: 'Historique des connexions', icon: 'pi pi-history', routerLink: '/settings/login-history' },
      );
    }

    return menu;
  });

}
