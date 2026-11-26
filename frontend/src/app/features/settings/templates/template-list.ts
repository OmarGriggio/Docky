import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TemplateService } from './template.service';
import { LAYOUT_LABELS, Template } from '../../../shared/models/template';
import { AuthService } from '../../auth/auth.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

// Paramètres > Modèles: the company's document templates - each a look
// (layout, font, colors, header image) and the texts and conditions a new
// quote or invoice starts from. One is the default; a document picks its own
// (the form's "Modèle" button). Its admin creates, copies, edits and
// archives them; everyone else reads.
@Component({
  selector: 'app-template-list',
  standalone: true,
  imports: [FormsModule, Card, Button, Checkbox, ConfirmDialogComponent, TranslocoPipe],
  templateUrl: './template-list.html',
})
export class TemplateList implements OnInit {

  readonly layoutLabels = LAYOUT_LABELS;

  private templateService = inject(TemplateService);
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);
  private transloco = inject(TranslocoService);
  private router = inject(Router);

  templates = signal<Template[]>([]);
  loading = signal(true);
  showArchived = signal(false);
  visibleTemplates = computed(() => this.templates().filter(template => this.showArchived() || template.is_active));
  canManage = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());

  // The template the archive confirmation is about.
  toArchive = signal<Template | null>(null);
  archiveVisible = signal(false);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.templateService.getTemplates(true).subscribe({
      next: templates => {
        this.templates.set(templates);
        this.loading.set(false);
      },
      error: err => {
        this.notifications.error('template-list', err);
        this.loading.set(false);
      }
    });
  }

  open(template: Template): void {
    this.router.navigate(['/settings/templates', template.id]);
  }

  // A new template starts from the default one's texts and conditions on the
  // backend side (a starter) - opened right away to be filled in.
  create(): void {
    this.templateService.createTemplate({ name: this.transloco.translate('templates.newName') }).subscribe({
      next: template => this.open(template),
      error: err => this.notifications.error('template-list', err)
    });
  }

  duplicate(template: Template): void {
    const name = this.transloco.translate('templates.copyName', { name: template.name }).slice(0, 100);
    this.templateService.duplicateTemplate(template.id, name).subscribe({
      next: copy => this.open(copy),
      error: err => this.notifications.error('template-list', err)
    });
  }

  setDefault(template: Template): void {
    this.templateService.setDefault(template.id).subscribe({
      next: () => {
        this.notifications.success('templates.defaultSet');
        this.load();
      },
      error: err => this.notifications.error('template-list', err)
    });
  }

  askArchive(template: Template): void {
    this.toArchive.set(template);
    this.archiveVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const template = this.toArchive();
    if (template) {
      this.templateService.archive(template.id).subscribe({
        next: () => this.load(),
        error: err => this.notifications.error('template-list', err)
      });
    }
  }

  restore(template: Template): void {
    this.templateService.unarchive(template.id).subscribe({
      next: () => this.load(),
      error: err => this.notifications.error('template-list', err)
    });
  }

}
