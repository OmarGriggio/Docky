import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [Menu],
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
        { label: 'Utilisateurs', icon: 'pi pi-users', routerLink: '/admin/users' },
        { label: 'Nouvel utilisateur', icon: 'pi pi-user-plus', routerLink: '/admin/users/new' },
        { label: 'UI Kit', icon: 'pi pi-palette', routerLink: '/uitest' },
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
