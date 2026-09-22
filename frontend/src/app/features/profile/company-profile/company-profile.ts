import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { FileUpload, FileUploadHandlerEvent } from 'primeng/fileupload';
import { CompanyService } from '../company.service';
import { AuthService } from '../../auth/auth.service';
import { DocumentTemplateService } from '../../documents/document-template.service';
import { TabIndentDirective } from '../../../shared/directives/tab-indent.directive';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, Textarea, FloatLabel, Button, Card, FileUpload, TabIndentDirective],
  templateUrl: './company-profile.html',
  styleUrl: './company-profile.css',
})
export class CompanyProfile implements OnInit {

  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);
  private documentTemplateService = inject(DocumentTemplateService);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: [''],
    phone: [''],
    iban: [''],
    street: [''],
    postal_code: [''],
    city: [''],
    country: [''],
    vat_rate: [8.1, Validators.required],
    vat_number: [''],
  });

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
    payment_terms: [''],
  });

  templatesLoading = signal(true);
  templatesSuccessMessage = signal<string | null>(null);
  templatesErrorMessage = signal<string | null>(null);

  loading = signal(true);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  logoPath = signal<string | null>(null);
  logoUrl = computed(() => this.companyService.getFileUrl(this.logoPath()));
  logoErrorMessage = signal<string | null>(null);

  // Same for the image shown at the very top of a generated invoice (see
  // backend/src/pdf's InvoiceTemplate).
  headerImagePath = signal<string | null>(null);
  headerImageUrl = computed(() => this.companyService.getFileUrl(this.headerImagePath()));
  headerImageErrorMessage = signal<string | null>(null);

  // Edited in the "Modèles de documents" card below (templatesForm), not
  // this component's own `form` - kept here (not just inside templatesForm)
  // so submit() below can still send the *current* value on the main
  // form's own full-row PUT, same reasoning as logoPath/headerImagePath
  // above for a field with its own independent save path.
  paymentTerms = signal<string | null>(null);

  private companyId: number | null = null;

  // A PLATFORM_ADMIN can manage a company's profile too, same as that
  // company's own ADMIN - see zz_docs/Decisions.md's "Cross-company access"
  // entry (this page is reached by impersonating a company first, same flow
  // an ADMIN would use for their own).
  canManageCompany = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());

  ngOnInit(): void {
    this.loadCompany();
    this.loadTemplates();
  }

  private loadCompany(): void {
    this.loading.set(true);

    // Straight from the token - company_id is already right there
    // (currentUser().company_id is the impersonated one while a
    // PLATFORM_ADMIN is acting as this company, their own otherwise), no
    // need to fetch the company's user list just to find "self" in it
    // (GET /user is PLATFORM_ADMIN only now anyway - see user.routes.ts).
    this.companyId = this.authService.currentUser()?.company_id ?? null;

    if (this.companyId === null) {
      this.errorMessage.set('Impossible de retrouver votre entreprise.');
      this.loading.set(false);
      return;
    }

    this.companyService.getCompany(this.companyId).subscribe({
      next: company => {
        this.form.patchValue({
          name: company.name ?? '',
          email: company.email ?? '',
          phone: company.phone ?? '',
          iban: company.iban ?? '',
          street: company.street ?? '',
          postal_code: company.postal_code ?? '',
          city: company.city ?? '',
          country: company.country ?? '',
          vat_rate: company.vat_rate,
          vat_number: company.vat_number ?? '',
        });
        this.logoPath.set(company.logo);
        this.headerImagePath.set(company.header_image);
        this.paymentTerms.set(company.payment_terms);
        this.templatesForm.patchValue({ payment_terms: company.payment_terms ?? '' });
        this.loading.set(false);

        if (!this.canManageCompany()) {
          this.form.disable();
        }
      },
      error: err => {
        console.error('profile : ' + err);
        this.errorMessage.set('Impossible de charger les données de l\'entreprise.');
        this.loading.set(false);
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.companyId === null) {
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.companyService.updateCompany(this.companyId, {
      ...this.form.getRawValue(),
      logo: this.logoPath(),
      header_image: this.headerImagePath(),
      payment_terms: this.paymentTerms(),
    }).subscribe({
      next: () => {
        this.successMessage.set('Les données de l\'entreprise ont été mises à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        this.errorMessage.set('Impossible de mettre à jour les données de l\'entreprise.');
      }
    });
  }

  private loadTemplates(): void {
    this.templatesLoading.set(true);

    forkJoin({
      quote: this.documentTemplateService.getTemplate('QUOTE'),
      invoice: this.documentTemplateService.getTemplate('INVOICE'),
    }).subscribe({
      next: ({ quote, invoice }) => {
        this.templatesForm.patchValue({
          quote_introduction: quote?.introduction ?? '',
          quote_conclusion: quote?.conclusion ?? '',
          invoice_introduction: invoice?.introduction ?? '',
          invoice_conclusion: invoice?.conclusion ?? '',
        });
        this.templatesLoading.set(false);

        if (!this.canManageCompany()) {
          this.templatesForm.disable();
        }
      },
      error: err => {
        console.error('profile : ' + err);
        this.templatesErrorMessage.set('Impossible de charger les modèles de documents.');
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

    const { quote_introduction, quote_conclusion, invoice_introduction, invoice_conclusion, payment_terms } = this.templatesForm.getRawValue();

    forkJoin({
      quote: this.documentTemplateService.upsertTemplate('QUOTE', { introduction: quote_introduction, conclusion: quote_conclusion }),
      invoice: this.documentTemplateService.upsertTemplate('INVOICE', { introduction: invoice_introduction, conclusion: invoice_conclusion }),
      company: this.companyService.updatePaymentTerms(this.companyId, payment_terms.trim() || null),
    }).subscribe({
      next: ({ company }) => {
        this.paymentTerms.set(company.payment_terms);
        this.templatesSuccessMessage.set('Les modèles de documents ont été mis à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        this.templatesErrorMessage.set('Impossible de mettre à jour les modèles de documents.');
      }
    });
  }

  // p-fileupload (customUpload + auto): fires as soon as a file is picked or
  // dropped, already filtered by accept/maxFileSize - the actual upload goes
  // through our own endpoints, not PrimeNG's built-in XHR one.
  uploadLogo(event: FileUploadHandlerEvent, upload: FileUpload): void {
    const file = event.files[0];
    if (!file || this.companyId === null) {
      return;
    }

    this.logoErrorMessage.set(null);

    this.companyService.uploadLogo(this.companyId, file).subscribe({
      next: company => {
        this.logoPath.set(company.logo);
        upload.clear();
        this.successMessage.set('Le logo a été mis à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        upload.clear();
        this.logoErrorMessage.set('Impossible de mettre à jour le logo.');
      }
    });
  }

  uploadHeaderImage(event: FileUploadHandlerEvent, upload: FileUpload): void {
    const file = event.files[0];
    if (!file || this.companyId === null) {
      return;
    }

    this.headerImageErrorMessage.set(null);

    this.companyService.uploadHeaderImage(this.companyId, file).subscribe({
      next: company => {
        this.headerImagePath.set(company.header_image);
        upload.clear();
        this.successMessage.set("L'image d'en-tête a été mise à jour.");
      },
      error: err => {
        console.error('profile : ' + err);
        upload.clear();
        this.headerImageErrorMessage.set("Impossible de mettre à jour l'image d'en-tête.");
      }
    });
  }

}
