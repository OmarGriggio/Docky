import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { InputNumber } from 'primeng/inputnumber';
import { Checkbox } from 'primeng/checkbox';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ReminderService } from '../../reminders/reminder.service';
import { ReminderLevelSettings, reminderLevelKey } from '../../../shared/models/reminder';

// Paramètres > Rappels: the company's three reminder levels - the 1st
// reminder, the 2nd and the formal notice - each with its delay after the
// previous one (the 1st's after the due date) and its fee. Their texts are
// the templates' (Modèles > Rappel). Read by every role, an admin's to
// change, like the numbering.
@Component({
  selector: 'app-reminder-settings',
  standalone: true,
  imports: [FormsModule, Card, Button, InputNumber, Checkbox, TranslocoPipe],
  templateUrl: './reminder-settings.html',
})
export class ReminderSettings implements OnInit {

  private reminderService = inject(ReminderService);
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);

  canEdit = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());
  loading = signal(true);
  saving = signal(false);
  levels = signal<ReminderLevelSettings[]>([]);
  showRequired = signal(false);

  readonly levelKey = reminderLevelKey;

  ngOnInit(): void {
    this.reminderService.getSettings().subscribe({
      next: levels => {
        this.levels.set(levels);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.notifications.error('reminder-settings', err);
      },
    });
  }

  update(level: ReminderLevelSettings, patch: Partial<ReminderLevelSettings>): void {
    this.levels.update(levels => levels.map(item => item.level === level.level ? { ...item, ...patch } : item));
  }

  save(): void {
    if (this.levels().some(level => level.delay_days === null)) {
      this.showRequired.set(true);
      this.notifications.warn('common.requiredFields');
      return;
    }
    this.showRequired.set(false);
    this.saving.set(true);
    this.reminderService.updateSettings(this.levels().map(level => ({ ...level, fee: level.fee ?? 0 }))).subscribe({
      next: levels => {
        this.levels.set(levels);
        this.saving.set(false);
        this.notifications.success('reminders.settings.saved');
      },
      error: err => {
        this.saving.set(false);
        this.notifications.error('reminder-settings', err);
      },
    });
  }
}
