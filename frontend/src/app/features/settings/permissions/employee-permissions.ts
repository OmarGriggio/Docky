import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { TranslocoPipe, translateSignal } from '@jsverse/transloco';
import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';
import { AccessLevel, PERMISSION_MODULES, PermissionModule, Permissions } from '../../../shared/services/permission.service';

const API_BASE = environment.apiUrl;

// Paramètres > Droits des employés (an admin's page): what the company's
// employees (USER) may do in each module - hidden, read only, or everything.
// Enforced by the backend (permission.middleware.ts); the employees' own
// screens follow (PermissionService).
@Component({
  selector: 'app-employee-permissions',
  standalone: true,
  imports: [FormsModule, Card, Button, SelectButton, TranslocoPipe],
  templateUrl: './employee-permissions.html',
})
export class EmployeePermissions implements OnInit {

  private http = inject(HttpClient);
  private notifications = inject(NotificationService);

  readonly modules = PERMISSION_MODULES;
  permissions = signal<Permissions | null>(null);
  saving = signal(false);

  private noneLabel = translateSignal('settings.permissions.none');
  private readLabel = translateSignal('settings.permissions.read');
  private writeLabel = translateSignal('settings.permissions.write');
  levelOptions = computed<{ label: string; value: AccessLevel }[]>(() => [
    { label: this.noneLabel(), value: 'NONE' },
    { label: this.readLabel(), value: 'READ' },
    { label: this.writeLabel(), value: 'WRITE' },
  ]);

  ngOnInit(): void {
    this.http.get<Permissions>(`${API_BASE}/permissions/employees`).subscribe({
      next: permissions => this.permissions.set(permissions),
      error: err => this.notifications.error('employee-permissions', err),
    });
  }

  setLevel(module: PermissionModule, level: AccessLevel | null): void {
    const permissions = this.permissions();
    if (!permissions || !level) {
      return;
    }
    this.permissions.set({ ...permissions, modules: { ...permissions.modules, [module]: level } });
  }

  // A worker on site: the job sites and the calendar, nothing else.
  applyWorkerPreset(): void {
    const permissions = this.permissions();
    if (!permissions) {
      return;
    }
    this.permissions.set({
      ...permissions,
      modules: { clients: 'READ', catalog: 'READ', quotes: 'NONE', invoices: 'NONE', projects: 'WRITE', calendar: 'READ', dashboard: 'NONE' },
    });
  }

  save(): void {
    const permissions = this.permissions();
    if (!permissions) {
      return;
    }
    this.saving.set(true);
    this.http.put<Permissions>(`${API_BASE}/permissions/employees`, permissions).subscribe({
      next: saved => {
        this.permissions.set(saved);
        this.saving.set(false);
        this.notifications.success('settings.permissions.saved');
      },
      error: err => {
        this.saving.set(false);
        this.notifications.error('employee-permissions', err);
      },
    });
  }

}
