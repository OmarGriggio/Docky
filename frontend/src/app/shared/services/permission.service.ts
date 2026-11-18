import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../features/auth/auth.service';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

// The modules an employee's permissions cover (the backend's permissions.ts).
export type PermissionModule = 'clients' | 'catalog' | 'quotes' | 'invoices' | 'projects' | 'calendar' | 'dashboard';
export type AccessLevel = 'NONE' | 'READ' | 'WRITE';
export const PERMISSION_MODULES: PermissionModule[] = ['clients', 'catalog', 'quotes', 'invoices', 'projects', 'calendar', 'dashboard'];

export interface Permissions {
  modules: Record<PermissionModule, AccessLevel>;
  prices: boolean;
}

const RANK: Record<AccessLevel, number> = { NONE: 0, READ: 1, WRITE: 2 };

// What the logged-in user may do - an admin everything, an employee (USER)
// what their company's admin set (Paramètres > Droits des employés). The
// screens hide what isn't allowed; the backend refuses it anyway (403), this
// is only so nobody runs into it. Read again whenever the user changes
// (login, impersonation, logout).
@Injectable({ providedIn: 'root' })
export class PermissionService {

  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private employeePermissions = signal<Permissions | null>(null);
  private loading: Promise<void> | null = null;

  // An employee's own permissions - not loaded yet: nothing allowed, so a
  // hidden module never flashes on screen.
  private isEmployee = computed(() => this.auth.currentUser()?.role === 'USER');

  private readonly reload = effect(() => {
    const user = this.auth.currentUser();
    this.employeePermissions.set(null);
    this.loading = user?.role === 'USER' ? this.load() : null;
  });

  private async load(): Promise<void> {
    try {
      this.employeePermissions.set(await firstValueFrom(this.http.get<Permissions>(`${API_BASE}/permissions/me`)));
    } catch {
      // Left at "nothing allowed": the pages' own requests would be refused anyway.
    }
  }

  /** Resolves once an employee's permissions are known - the route guards wait for it. */
  async ready(): Promise<void> {
    await this.loading;
  }

  can(module: PermissionModule, level: AccessLevel = 'READ'): boolean {
    if (!this.auth.isAuthenticated()) {
      return false;
    }
    if (!this.isEmployee()) {
      return true;
    }
    const permissions = this.employeePermissions();
    return !!permissions && RANK[permissions.modules[module]] >= RANK[level];
  }

  /** Prices and amounts shown - always for an admin. */
  canSeePrices = computed(() => !this.isEmployee() || !!this.employeePermissions()?.prices);

}
