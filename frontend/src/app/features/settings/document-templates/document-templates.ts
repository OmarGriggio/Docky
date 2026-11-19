import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CompanyService } from '../../profile/company.service';
import { AuthService } from '../../auth/auth.service';
import { DocumentTemplateService } from '../../documents/document-template.service';
import { TabIndentDirective } from '../../../shared/directives/tab-indent.directive';
import { NotificationService } from '../../../shared/services/notification.service';
import { placeholderToken } from '../../../shared/utils/display';
import { TextStyleToolbar } from '../../../shared/components/text-style-toolbar/text-style-toolbar';
import { DocumentColors } from '../../../shared/components/rich-text-view/rich-text-view';

@Component({
  selector: 'app-document-templates',
  standalone: true,
  imports: [ReactiveFormsModule, InputNumber, Textarea, FloatLabel, Button, Card, Tabs, TabList, Tab, TabPanels, TabPanel, TabIndentDirective, TranslocoPipe, TextStyleToolbar],
  templateUrl: './document-templates.html',
})
export class DocumentTemplates implements OnInit {

  private notifications = inject(NotificationService);
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);
  private documentTemplateService = inject(DocumentTemplateService);
  private transloco = inject(TranslocoService);

  // Default introduction/conclusion/payment terms applied when that type is
  // picked on a new document (see document-form.ts) - introduction/
  // conclusion are one document_templates row per (company, type);
  // payment_terms is company-wide (not per type, unlike the other two -
  // see updateCompanyPaymentTermsServ on the backend), edited together here
  // since it's the same "default for a new document" idea.
  templatesForm = this.fb.nonNullable.group({
    quote_introduction: [''],
    quote_conclusion: [''],
    invoice_introduction: [''],
    invoice_conclusion: [''],
    quote_due_days: [null as number | null],
    invoice_due_days: [null as number | null],
    reminder_text: [''],
    payment_terms: [''],
  });

  // The {{placeholders}} the backend fills in on the payment reminder PDF
  // (see backend/src/pdf/templates/reminder.placeholders.ts) - shown as help
  // under the reminder text field. Built here as strings (not written in the
  // template) since a literal double brace there is read as an interpolation.
  // `label`s are Transloco keys (see document-templates.html's `| transloco`),
  // not display text - same pattern as nav-bar.ts's navItems. Each token
  // named in the UI's language ({{montant}} / {{amount}} - both work).

  private placeholders(names: [string, string][]) {
    return names.map(([name, label]) => ({ token: placeholderToken(name, this.transloco.activeLang()), label: `documentTemplates.placeholders.${label}` }));
  }

  reminderPlaceholders = computed(() => this.placeholders([
    ['numero_facture', 'invoiceNumber'],
    ['date_facture', 'invoiceDate'],
    ['date_echeance', 'dueDate'],
    ['montant', 'amount'],
    ['jours_retard', 'daysLate'],
    ['client', 'clientName'],
    ['signature_entreprise', 'signature'],
  ]));

  // Same for an invoice's/quote's introduction and conclusion (see the
  // backend's pdf/templates/document.placeholders.ts).
  documentPlaceholders = computed(() => this.placeholders([
    ['titre_client', 'clientTitle'],
    ['date', 'documentDate'],
    ['montant', 'amount'],
    ['signature_entreprise', 'signature'],
  ]));

  // The company's two document colors - the texts' formatting toolbar.
  colors = signal<DocumentColors>({ 1: null, 2: null });

  templatesLoading = signal(true);
  templatesSuccessMessage = signal<string | null>(null);
  templatesErrorMessage = signal<string | null>(null);

  private companyId: number | null = null;

  // A PLATFORM_ADMIN can manage a company's templates too, same as that
  // company's own ADMIN - see zz_docs/Decisions.md's "Cross-company access"
  // entry (this page is reached by impersonating a company first, same flow
  // an ADMIN would use for their own).
  canManageCompany = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());

  ngOnInit(): void {
    // Straight from the token - company_id is already right there
    // (currentUser().company_id is the impersonated one while a
    // PLATFORM_ADMIN is acting as this company, their own otherwise).
    this.companyId = this.authService.currentUser()?.company_id ?? null;

    this.loadPaymentTerms();
    this.loadTemplates();
  }

  // payment_terms lives on the company itself (companies.payment_terms), not
  // in document_templates - fetched separately from the templates below.
  private loadPaymentTerms(): void {
    if (this.companyId === null) {
      return;
    }

    this.companyService.getCompany(this.companyId).subscribe({
      next: company => {
        this.templatesForm.patchValue({ payment_terms: company.payment_terms ?? '' });
        this.colors.set({ 1: company.accent_color, 2: company.secondary_color });
      },
      error: err => this.notifications.error('settings', err)
    });
  }

  private loadTemplates(): void {
    this.templatesLoading.set(true);

    forkJoin({
      quote: this.documentTemplateService.getTemplate('QUOTE'),
      invoice: this.documentTemplateService.getTemplate('INVOICE'),
      reminder: this.documentTemplateService.getTemplate('REMINDER'),
    }).subscribe({
      next: ({ quote, invoice, reminder }) => {
        this.templatesForm.patchValue({
          quote_introduction: quote?.introduction ?? '',
          quote_conclusion: quote?.conclusion ?? '',
          invoice_introduction: invoice?.introduction ?? '',
          invoice_conclusion: invoice?.conclusion ?? '',
          quote_due_days: quote?.due_days ?? null,
          invoice_due_days: invoice?.due_days ?? null,
          reminder_text: reminder?.introduction ?? '',
        });
        this.templatesLoading.set(false);

        if (!this.canManageCompany()) {
          this.templatesForm.disable();
        }
      },
      error: err => {
        console.error('settings : ' + err);
        this.templatesErrorMessage.set(this.transloco.translate('documentTemplates.loadError'));
        this.templatesLoading.set(false);
      }
    });
  }

  submitTemplates(): void {
    if (this.companyId === null) {
      return;
    }

    this.templatesSuccessMessage.set(null);
    this.templatesErrorMessage.set(null);

    const { quote_introduction, quote_conclusion, invoice_introduction, invoice_conclusion, quote_due_days, invoice_due_days, reminder_text, payment_terms } = this.templatesForm.getRawValue();

    forkJoin({
      quote: this.documentTemplateService.upsertTemplate('QUOTE', { introduction: quote_introduction, conclusion: quote_conclusion, due_days: quote_due_days }),
      invoice: this.documentTemplateService.upsertTemplate('INVOICE', { introduction: invoice_introduction, conclusion: invoice_conclusion, due_days: invoice_due_days }),
      reminder: this.documentTemplateService.upsertTemplate('REMINDER', { introduction: reminder_text, conclusion: null }),
      company: this.companyService.updatePaymentTerms(this.companyId, payment_terms.trim() || null),
    }).subscribe({
      next: () => {
        this.templatesSuccessMessage.set(this.transloco.translate('documentTemplates.updateSuccess'));
      },
      error: err => {
        console.error('settings : ' + err);
        this.templatesErrorMessage.set(this.transloco.translate('documentTemplates.updateError'));
      }
    });
  }

}
