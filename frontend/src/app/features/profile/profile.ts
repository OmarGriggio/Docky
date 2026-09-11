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

  items = computed<MenuItem[]>(() => {
    const menu: MenuItem[] = [
      { label: 'Entreprise', icon: 'pi pi-building', routerLink: '/profile/company' },
    ];

    if (this.isAdmin()) {
      menu.push(
        { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: '/profile/users' },
        { label: 'Nouvel utilisateur', icon: 'pi pi-user-plus', routerLink: '/profile/users/new' },
        { label: 'UI Kit', icon: 'pi pi-palette', routerLink: '/profile/uitest' },
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
