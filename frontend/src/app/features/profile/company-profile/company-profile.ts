import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { CompanyService } from '../company.service';
import { AuthService } from '../../auth/auth.service';
import { DocumentTemplateService } from '../../documents/document-template.service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

@Component({
  selector: 'app-company-profile',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, FloatLabel, Button, Card],
  templateUrl: './company-profile.html',
  styleUrl: './company-profile.css',
})
export class CompanyProfile implements OnInit, OnDestroy {

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
  });

  // Default introduction/conclusion text applied when that type is picked
  // on a new document (see document-form.ts) - one document_templates row
  // per (company, type), edited together here.
  templatesForm = this.fb.nonNullable.group({
    quote_introduction: [''],
    quote_conclusion: [''],
    invoice_introduction: [''],
    invoice_conclusion: [''],
  });

  templatesLoading = signal(true);
  templatesSuccessMessage = signal<string | null>(null);
  templatesErrorMessage = signal<string | null>(null);

  loading = signal(true);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  logoPath = signal<string | null>(null);
  logoPreviewUrl = computed(() => this.companyService.getFileUrl(this.logoPath()));
  selectedLogoFile = signal<File | null>(null);
  // Local preview of a just-dropped/selected file, before it's actually
  // uploaded - takes priority over the currently-saved logo so the admin
  // sees what they're about to upload, not the old one.
  private selectedLogoPreviewUrl = signal<string | null>(null);
  displayedLogoUrl = computed(() => this.selectedLogoPreviewUrl() ?? this.logoPreviewUrl());
  isDraggingOverLogo = signal(false);
  uploadingLogo = signal(false);
  logoErrorMessage = signal<string | null>(null);

  // Same pattern as the logo above, for the image shown at the very top of
  // a generated invoice (see backend/src/pdf's InvoiceTemplate).
  headerImagePath = signal<string | null>(null);
  headerImagePreviewUrl = computed(() => this.companyService.getFileUrl(this.headerImagePath()));
  selectedHeaderImageFile = signal<File | null>(null);
  private selectedHeaderImagePreviewUrl = signal<string | null>(null);
  displayedHeaderImageUrl = computed(() => this.selectedHeaderImagePreviewUrl() ?? this.headerImagePreviewUrl());
  isDraggingOverHeaderImage = signal(false);
  uploadingHeaderImage = signal(false);
  headerImageErrorMessage = signal<string | null>(null);

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

  ngOnDestroy(): void {
    this.clearSelectedLogoPreview();
    this.clearSelectedHeaderImagePreview();
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
        });
        this.logoPath.set(company.logo);
        this.headerImagePath.set(company.header_image);
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

    this.companyService.updateCompany(this.companyId, { ...this.form.getRawValue(), logo: this.logoPath(), header_image: this.headerImagePath() }).subscribe({
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
    this.templatesSuccessMessage.set(null);
    this.templatesErrorMessage.set(null);

    const { quote_introduction, quote_conclusion, invoice_introduction, invoice_conclusion } = this.templatesForm.getRawValue();

    forkJoin({
      quote: this.documentTemplateService.upsertTemplate('QUOTE', { introduction: quote_introduction, conclusion: quote_conclusion }),
      invoice: this.documentTemplateService.upsertTemplate('INVOICE', { introduction: invoice_introduction, conclusion: invoice_conclusion }),
    }).subscribe({
      next: () => {
        this.templatesSuccessMessage.set('Les modèles de documents ont été mis à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        this.templatesErrorMessage.set('Impossible de mettre à jour les modèles de documents.');
      }
    });
  }

  onDropzoneClick(fileInput: HTMLInputElement): void {
    if (!this.canManageCompany()) {
      return;
    }
    fileInput.click();
  }

  onDragOver(event: DragEvent): void {
    if (!this.canManageCompany()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOverLogo.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOverLogo.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOverLogo.set(false);

    if (!this.canManageCompany()) {
      return;
    }

    this.handleSelectedLogoFile(event.dataTransfer?.files?.[0] ?? null);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handleSelectedLogoFile(input.files?.[0] ?? null);
    // Reset so selecting the exact same file again still fires a change event.
    input.value = '';
  }

  private handleSelectedLogoFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.logoErrorMessage.set('Le logo doit être un fichier JPG ou PNG.');
      return;
    }

    this.logoErrorMessage.set(null);
    this.selectedLogoFile.set(file);

    this.clearSelectedLogoPreview();
    this.selectedLogoPreviewUrl.set(URL.createObjectURL(file));
  }

  private clearSelectedLogoPreview(): void {
    const current = this.selectedLogoPreviewUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
    this.selectedLogoPreviewUrl.set(null);
  }

  uploadLogo(): void {
    const file = this.selectedLogoFile();
    if (!file || this.companyId === null) {
      return;
    }

    this.uploadingLogo.set(true);
    this.logoErrorMessage.set(null);

    this.companyService.uploadLogo(this.companyId, file).subscribe({
      next: company => {
        this.logoPath.set(company.logo);
        this.selectedLogoFile.set(null);
        this.clearSelectedLogoPreview();
        this.uploadingLogo.set(false);
        this.successMessage.set('Le logo a été mis à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        this.logoErrorMessage.set('Impossible de mettre à jour le logo.');
        this.uploadingLogo.set(false);
      }
    });
  }

  onHeaderImageDropzoneClick(fileInput: HTMLInputElement): void {
    if (!this.canManageCompany()) {
      return;
    }
    fileInput.click();
  }

  onHeaderImageDragOver(event: DragEvent): void {
    if (!this.canManageCompany()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOverHeaderImage.set(true);
  }

  onHeaderImageDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOverHeaderImage.set(false);
  }

  onHeaderImageDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOverHeaderImage.set(false);

    if (!this.canManageCompany()) {
      return;
    }

    this.handleSelectedHeaderImageFile(event.dataTransfer?.files?.[0] ?? null);
  }

  onHeaderImageFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handleSelectedHeaderImageFile(input.files?.[0] ?? null);
    input.value = '';
  }

  private handleSelectedHeaderImageFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.headerImageErrorMessage.set('L\'image d\'en-tête doit être un fichier JPG ou PNG.');
      return;
    }

    this.headerImageErrorMessage.set(null);
    this.selectedHeaderImageFile.set(file);

    this.clearSelectedHeaderImagePreview();
    this.selectedHeaderImagePreviewUrl.set(URL.createObjectURL(file));
  }

  private clearSelectedHeaderImagePreview(): void {
    const current = this.selectedHeaderImagePreviewUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
    this.selectedHeaderImagePreviewUrl.set(null);
  }

  uploadHeaderImage(): void {
    const file = this.selectedHeaderImageFile();
    if (!file || this.companyId === null) {
      return;
    }

    this.uploadingHeaderImage.set(true);
    this.headerImageErrorMessage.set(null);

    this.companyService.uploadHeaderImage(this.companyId, file).subscribe({
      next: company => {
        this.headerImagePath.set(company.header_image);
        this.selectedHeaderImageFile.set(null);
        this.clearSelectedHeaderImagePreview();
        this.uploadingHeaderImage.set(false);
        this.successMessage.set('L\'image d\'en-tête a été mise à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        this.headerImageErrorMessage.set('Impossible de mettre à jour l\'image d\'en-tête.');
        this.uploadingHeaderImage.set(false);
      }
    });
  }

}
