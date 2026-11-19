import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { SelectButton } from 'primeng/selectbutton';
import { FileUpload, FileUploadHandlerEvent } from 'primeng/fileupload';
import { CompanyService } from '../company.service';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../auth/auth.service';
import { PostalCodeCity } from '../../../shared/components/postal-code-city/postal-code-city';
import { splitPostalCodeCity } from '../../../shared/utils/postal-code-search';
import { InvoicingReadinessBanner } from '../../../shared/components/invoicing-readiness-banner/invoicing-readiness-banner';
import { Company } from '../../../shared/models/company';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, FloatLabel, Button, Card, SelectButton, FileUpload, PostalCodeCity, InvoicingReadinessBanner, ConfirmDialogComponent, RouterLink, TranslocoPipe],
  templateUrl: './company-profile.html',
  styleUrl: './company-profile.css',
})
export class CompanyProfile implements OnInit {

  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);
  private transloco = inject(TranslocoService);

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: [''],
    phone: [''],
    iban: [''],
    street: [''],
    // "1950 Sion" - one field, stored as the company's NPA and town (joined
    // on load, split on save). Optional, like the rest of the address.
    postalCodeCity: [''],
    country: [''],
    vat_rate: [8.1, Validators.required],
    vat_number: [''],
    // The columns' own lengths, same as the backend checks (company.service.ts's
    // normalizeCompanyData).
    website: ['', Validators.maxLength(255)],
    bank_name: ['', Validators.maxLength(100)],
    bank_account: ['', Validators.maxLength(50)],
    // The QR-bill's reference (see the backend's payment-reference.ts): a
    // QR reference with a QR-IBAN, otherwise a creditor reference or none.
    qr_iban: [''],
    payment_reference_type: ['SCOR' as 'SCOR' | 'NONE'],
  });

  private referenceCreditorLabel = translateSignal('profile.paymentReference.creditor');
  private referenceNoneLabel = translateSignal('profile.paymentReference.none');
  referenceOptions = computed(() => [
    { label: this.referenceCreditorLabel(), value: 'SCOR' },
    { label: this.referenceNoneLabel(), value: 'NONE' },
  ]);

  // With a QR-IBAN, the reference is always a QR reference - the choice
  // below only applies without one.
  private qrIbanValue = toSignal(this.form.controls.qr_iban.valueChanges, { initialValue: '' });
  hasQrIban = computed(() => !!this.qrIbanValue()?.trim());

  loading = signal(true);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  logoPath = signal<string | null>(null);
  logoUrl = computed(() => this.companyService.getFileUrl(this.logoPath()));
  logoErrorMessage = signal<string | null>(null);

  private companyId: number | null = null;
  // The profile as saved - what the "complete your profile" banner reads.
  savedCompany = signal<Company | null>(null);

  // A PLATFORM_ADMIN can manage a company's profile too, same as that
  // company's own ADMIN - see zz_docs/Decisions.md's "Cross-company access"
  // entry (this page is reached by impersonating a company first, same flow
  // an ADMIN would use for their own).
  canManageCompany = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());

  ngOnInit(): void {
    this.loadCompany();
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
      this.errorMessage.set(this.transloco.translate('profile.companyNotFound'));
      this.loading.set(false);
      return;
    }

    this.companyService.getCompany(this.companyId).subscribe({
      next: company => {
        this.savedCompany.set(company);
        this.form.patchValue({
          name: company.name ?? '',
          email: company.email ?? '',
          phone: company.phone ?? '',
          iban: company.iban ?? '',
          street: company.street ?? '',
          postalCodeCity: `${company.postal_code ?? ''} ${company.city ?? ''}`.trim(),
          country: company.country ?? '',
          vat_rate: company.vat_rate,
          vat_number: company.vat_number ?? '',
          website: company.website ?? '',
          bank_name: company.bank_name ?? '',
          bank_account: company.bank_account ?? '',
          qr_iban: company.qr_iban ?? '',
          payment_reference_type: company.payment_reference_type ?? 'SCOR',
        });
        this.logoPath.set(company.logo);
        this.loading.set(false);

        if (!this.canManageCompany()) {
          this.form.disable();
        }
      },
      error: err => {
        console.error('profile : ' + err);
        this.errorMessage.set(this.transloco.translate('profile.loadError'));
        this.loading.set(false);
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.companyId === null) {
      // PrimeNG outlines an invalid field in red once it's dirty.
      this.form.markAllAsDirty();
      this.errorMessage.set(this.transloco.translate('common.requiredFields'));
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);

    const { postalCodeCity, ...value } = this.form.getRawValue();
    const { postalCode, city } = splitPostalCodeCity(postalCodeCity);
    this.companyService.updateCompany(this.companyId, {
      ...value,
      postal_code: postalCode,
      city,
      logo: this.logoPath(),
    }).subscribe({
      next: company => {
        this.savedCompany.set(company);
        this.successMessage.set(this.transloco.translate('profile.updated'));
      },
      error: (err: HttpErrorResponse) => {
        console.error('profile : ' + err);
        // A QR-IBAN that isn't one says so - the generic message wouldn't.
        const key = err.error?.code === 'QR_IBAN_INVALID' ? 'profile.paymentReference.qrIbanInvalid'
          : err.error?.code === 'IBAN_IS_QR_IBAN' ? 'profile.paymentReference.ibanIsQrIban'
          : 'profile.updateError';
        this.errorMessage.set(this.transloco.translate(key));
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
        this.successMessage.set(this.transloco.translate('profile.logoUpdated'));
      },
      error: err => {
        console.error('profile : ' + err);
        upload.clear();
        this.logoErrorMessage.set(this.transloco.translate('profile.logoUpdateError'));
      }
    });
  }

  // Whether the confirm dialog removing the logo is open.
  removeConfirmVisible = signal(false);

  // The PDFs print without it from then on.
  onRemoveLogoConfirmed(): void {
    if (this.companyId === null) {
      return;
    }
    this.logoErrorMessage.set(null);
    this.companyService.removeLogo(this.companyId).subscribe({
      next: company => {
        this.logoPath.set(company.logo);
        this.successMessage.set(this.transloco.translate('profile.logoRemoved'));
      },
      error: err => {
        console.error('profile : ' + err);
        this.logoErrorMessage.set(this.transloco.translate('profile.imageRemoveError'));
      }
    });
  }

}
