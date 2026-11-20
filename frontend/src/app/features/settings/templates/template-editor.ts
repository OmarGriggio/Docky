import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { FileUpload, FileUploadHandlerEvent } from 'primeng/fileupload';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TemplateService } from './template.service';
import { COLOR_ELEMENTS, ColorElement, DocumentFont, DocumentLayout, ElementColors, MAX_PALETTE, PaletteColor, Template, TemplateData } from '../../../shared/models/template';
import { AuthService } from '../../auth/auth.service';
import { CompanyService } from '../../profile/company.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { TabIndentDirective } from '../../../shared/directives/tab-indent.directive';
import { TextStyleToolbar } from '../../../shared/components/text-style-toolbar/text-style-toolbar';
import { DocumentStylePicker } from '../../../shared/components/document-style-picker/document-style-picker';
import { DocumentColors } from '../../../shared/components/rich-text-view/rich-text-view';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DOCUMENT_PLACEHOLDERS, placeholderToken, REMINDER_PLACEHOLDERS } from '../../../shared/utils/display';

// An early payment discount with no number of days to pay within means
// nothing - the days are required as soon as there's a rate (the backend
// refuses it too).
const earlyPaymentDaysRequired: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const discount = group.get('early_payment_discount')?.value ?? 0;
  const days = group.get('early_payment_days')?.value;
  return discount > 0 && (days === null || days === undefined) ? { earlyPaymentDaysRequired: true } : null;
};

// One template, everything in it on one page: its look (layout and font,
// the two colors, the header image), the texts a new quote or invoice starts
// from and the reminder's, and the conditions (due days, payment terms, an
// invoice's early payment discount). Saved in one go - the header image has
// its own upload, saved at once. Read only for anyone but the admin.
@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink, Card, Button, InputText, InputNumber, Textarea, FloatLabel, FileUpload,
    Tabs, TabList, Tab, TabPanels, TabPanel, TabIndentDirective, TextStyleToolbar, DocumentStylePicker, ConfirmDialogComponent, TranslocoPipe,
  ],
  templateUrl: './template-editor.html',
})
export class TemplateEditor implements OnInit {

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private templateService = inject(TemplateService);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);
  private notifications = inject(NotificationService);
  private transloco = inject(TranslocoService);

  canManage = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());

  template = signal<Template | null>(null);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  // The template's palette (up to 5 named colors) and the one each element
  // of the PDF is printed in - kept apart from the reactive form (a list and
  // a map), saved with it, marking it dirty when changed.
  readonly maxPalette = MAX_PALETTE;
  readonly elements = COLOR_ELEMENTS;
  palette = signal<PaletteColor[]>([]);
  elementColors = signal<ElementColors>({});

  addColor(): void {
    if (this.palette().length >= MAX_PALETTE) {
      return;
    }
    const colors = ['#037a3f', '#1d4ed8', '#b45309', '#6b7280', '#be123c'];
    const name = this.transloco.translate('templates.colorName', { n: this.palette().length + 1 });
    this.palette.update(palette => [...palette, { name, color: colors[palette.length] }]);
    this.form.markAsDirty();
  }

  updateColor(position: number, change: Partial<PaletteColor>): void {
    this.palette.update(palette => palette.map((entry, index) => index === position ? { ...entry, ...change } : entry));
    this.form.markAsDirty();
  }

  // The elements in that color lose it, those in a later one follow it down a
  // position - a text's [cN] tags aren't renumbered (the hint says so).
  removeColor(position: number): void {
    this.palette.update(palette => palette.filter((_, index) => index !== position));
    this.elementColors.update(colors => Object.fromEntries(Object.entries(colors)
      .filter(([, value]) => value !== position + 1)
      .map(([element, value]) => [element, value! > position + 1 ? value! - 1 : value])) as ElementColors);
    this.form.markAsDirty();
  }

  setElementColor(element: ColorElement, position: number | null): void {
    this.elementColors.update(colors => {
      const next = { ...colors };
      if (position) next[element] = position; else delete next[element];
      return next;
    });
    this.form.markAsDirty();
  }

  colorOfElement(element: ColorElement): string | null {
    const position = this.elementColors()[element];
    return position ? this.palette()[position - 1]?.color ?? null : null;
  }

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    layout: ['CLASSIC' as DocumentLayout],
    font: ['HELVETICA' as DocumentFont],
    quote_introduction: [''],
    quote_conclusion: [''],
    quote_due_days: [null as number | null, Validators.min(0)],
    invoice_introduction: [''],
    invoice_conclusion: [''],
    invoice_due_days: [null as number | null, Validators.min(0)],
    payment_terms: [''],
    // Same bounds the backend enforces.
    early_payment_discount: [0, [Validators.min(0), Validators.max(100)]],
    early_payment_days: [null as number | null, [Validators.min(1), Validators.max(365)]],
    early_payment_min_amount: [0, [Validators.min(0), Validators.max(9999999999.99)]],
    reminder_text: [''],
  }, { validators: earlyPaymentDaysRequired });

  // What the text toolbars show, as the palette is being edited.
  colors = computed<DocumentColors>(() => this.palette());
  private formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  missingEarlyPaymentDays = computed(() => {
    this.formStatus();
    return this.form.hasError('earlyPaymentDaysRequired');
  });

  headerImageUrl = computed(() => this.companyService.getFileUrl(this.template()?.header_image ?? null));
  removeHeaderVisible = signal(false);

  // The {{placeholders}} each text can hold, named in the UI's language -
  // built here since a literal double brace in a template is read as an
  // interpolation (see documents.textBlock).
  private placeholders(names: [string, string][]) {
    return names.map(([name, label]) => ({ token: placeholderToken(name, this.transloco.activeLang()), label: `documentTemplates.placeholders.${label}` }));
  }
  documentPlaceholders = computed(() => this.placeholders(DOCUMENT_PLACEHOLDERS));
  reminderPlaceholders = computed(() => this.placeholders(REMINDER_PLACEHOLDERS));

  ngOnInit(): void {
    this.templateService.getTemplate(Number(this.route.snapshot.paramMap.get('id'))).subscribe({
      next: template => {
        this.fill(template);
        this.loading.set(false);
        if (!this.canManage()) {
          this.form.disable();
        }
      },
      error: err => {
        this.notifications.error('template-editor', err);
        this.loading.set(false);
      }
    });
  }

  private fill(template: Template): void {
    this.template.set(template);
    this.palette.set(template.palette ?? []);
    this.elementColors.set(template.element_colors ?? {});
    this.form.reset({
      name: template.name,
      layout: template.layout,
      font: template.font,
      quote_introduction: template.quote_introduction ?? '',
      quote_conclusion: template.quote_conclusion ?? '',
      quote_due_days: template.quote_due_days,
      invoice_introduction: template.invoice_introduction ?? '',
      invoice_conclusion: template.invoice_conclusion ?? '',
      invoice_due_days: template.invoice_due_days,
      payment_terms: template.payment_terms ?? '',
      early_payment_discount: template.early_payment_discount ?? 0,
      early_payment_days: template.early_payment_days,
      early_payment_min_amount: template.early_payment_min_amount ?? 0,
      reminder_text: template.reminder_text ?? '',
    });
  }

  pickLayout(layout: DocumentLayout): void {
    this.form.controls.layout.setValue(layout);
    this.form.markAsDirty();
  }

  pickFont(font: DocumentFont): void {
    this.form.controls.font.setValue(font);
    this.form.markAsDirty();
  }

  save(): void {
    const template = this.template();
    if (!template || !this.canManage()) {
      return;
    }
    if (this.form.invalid) {
      // PrimeNG outlines an invalid field in red once it's dirty.
      this.form.markAllAsDirty();
      this.errorMessage.set(this.transloco.translate('common.requiredFields'));
      return;
    }
    this.errorMessage.set(null);
    this.saving.set(true);

    const value = this.form.getRawValue();
    const data: TemplateData = {
      ...value,
      name: value.name.trim(),
      palette: this.palette(),
      element_colors: this.elementColors(),
      payment_terms: value.payment_terms.trim() ? value.payment_terms : null,
      reminder_text: value.reminder_text.trim() ? value.reminder_text : null,
      // An emptied number field comes back null - stored as "none" (0).
      early_payment_discount: value.early_payment_discount ?? 0,
      early_payment_min_amount: value.early_payment_min_amount ?? 0,
    };
    this.templateService.updateTemplate(template.id, data).subscribe({
      next: saved => {
        this.fill(saved);
        this.saving.set(false);
        this.notifications.success('templates.saved');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.notifications.error('template-editor', err);
      }
    });
  }

  // p-fileupload (customUpload + auto): fires as soon as a file is picked,
  // already filtered by accept/maxFileSize - saved at once, apart from the form.
  uploadHeaderImage(event: FileUploadHandlerEvent, upload: FileUpload): void {
    const template = this.template();
    const file = event.files[0];
    if (!template || !file) {
      return;
    }
    this.templateService.uploadHeaderImage(template.id, file).subscribe({
      next: saved => {
        this.template.set(saved);
        upload.clear();
        this.notifications.success('profile.headerImageUpdated');
      },
      error: err => {
        upload.clear();
        this.notifications.error('template-editor', err);
      }
    });
  }

  // A document already sent with it keeps printing it.
  onRemoveHeaderConfirmed(): void {
    const template = this.template();
    if (!template) {
      return;
    }
    this.templateService.removeHeaderImage(template.id).subscribe({
      next: saved => {
        this.template.set(saved);
        this.notifications.success('profile.headerImageRemoved');
      },
      error: err => this.notifications.error('template-editor', err)
    });
  }

}
