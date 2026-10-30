import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { translateSignal } from '@jsverse/transloco';
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
  imports: [Menu, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './settings.html',
})
export class Settings {

  private authService = inject(AuthService);

  private isPlatformAdmin = this.authService.isPlatformAdmin;

  // PrimeNG's Menu renders `label` as plain text (no pipe applied for us).
  // translateSignal() (not a one-off translate() call) is what keeps each
  // label correct both once the translation file's async load finishes and
  // across a later language switch - a plain translate() inside a computed
  // can run before the file has loaded, cache the raw key as a fallback,
  // and never re-run since nothing it reads changes again afterwards.
  private documentTemplatesLabel = translateSignal('settings.documentTemplates');
  private languageLabel = translateSignal('settings.language');
  private uiKitLabel = translateSignal('settings.uiKit');
  private companiesLabel = translateSignal('settings.companies');
  private usersLabel = translateSignal('settings.users');
  private newUserLabel = translateSignal('settings.newUser');
  private loginHistoryLabel = translateSignal('settings.loginHistory');
  private errorsLabel = translateSignal('settings.errors');

  items = computed<MenuItem[]>(() => {
    const menu: MenuItem[] = [
      { label: this.documentTemplatesLabel(), icon: 'pi pi-file-edit', routerLink: '/settings/templates' },
      { label: this.languageLabel(), icon: 'pi pi-language', routerLink: '/settings/language' },
    ];

    // User management was centralized to PLATFORM_ADMIN only (see
    // user.routes.ts on the backend) - an ordinary ADMIN no longer sees
    // these, even for their own company. They manage a company's users by
    // impersonating it first (see "Entreprises" below). The UI kit is a
    // developer's page, nothing a company's own admin needs.
    if (this.isPlatformAdmin()) {
      menu.push(
        { label: this.uiKitLabel(), icon: 'pi pi-palette', routerLink: '/settings/uitest' },
        { label: this.companiesLabel(), icon: 'pi pi-sitemap', routerLink: '/settings/companies' },
        { label: this.usersLabel(), icon: 'pi pi-users', routerLink: '/settings/users' },
        { label: this.newUserLabel(), icon: 'pi pi-user-plus', routerLink: '/settings/users/new' },
        { label: this.loginHistoryLabel(), icon: 'pi pi-history', routerLink: '/settings/login-history' },
        { label: this.errorsLabel(), icon: 'pi pi-exclamation-triangle', routerLink: '/settings/errors' },
      );
    }

    return menu;
  });

}
