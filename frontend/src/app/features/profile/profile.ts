import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { CompanyService } from './company.service';
import { UserService } from '../admin/user.service';
import { AuthService } from '../auth/auth.service';

const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png'];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Button, Card],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, OnDestroy {

  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private userService = inject(UserService);
  private authService = inject(AuthService);

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

  loading = signal(true);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  logoPath = signal<string | null>(null);
  logoPreviewUrl = computed(() => this.companyService.getLogoUrl(this.logoPath()));
  selectedLogoFile = signal<File | null>(null);
  // Local preview of a just-dropped/selected file, before it's actually
  // uploaded - takes priority over the currently-saved logo so the admin
  // sees what they're about to upload, not the old one.
  private selectedLogoPreviewUrl = signal<string | null>(null);
  displayedLogoUrl = computed(() => this.selectedLogoPreviewUrl() ?? this.logoPreviewUrl());
  isDraggingOver = signal(false);
  uploadingLogo = signal(false);
  logoErrorMessage = signal<string | null>(null);

  private companyId: number | null = null;

  isAdmin = this.authService.isAdmin;

  ngOnInit(): void {
    this.loadCompany();
  }

  ngOnDestroy(): void {
    this.clearSelectedLogoPreview();
  }

  private loadCompany(): void {
    this.loading.set(true);

    this.userService.getUsers().subscribe({
      next: users => {
        const self = users.find(user => user.id === this.authService.currentUser()?.userId);
        this.companyId = self?.company_id ?? null;

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
            this.loading.set(false);

            if (!this.isAdmin()) {
              this.form.disable();
            }
          },
          error: err => {
            console.error('profile : ' + err);
            this.errorMessage.set('Impossible de charger les données de l\'entreprise.');
            this.loading.set(false);
          }
        });
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

    this.companyService.updateCompany(this.companyId, { ...this.form.getRawValue(), logo: this.logoPath() }).subscribe({
      next: () => {
        this.successMessage.set('Les données de l\'entreprise ont été mises à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        this.errorMessage.set('Impossible de mettre à jour les données de l\'entreprise.');
      }
    });
  }

  onDropzoneClick(fileInput: HTMLInputElement): void {
    if (!this.isAdmin()) {
      return;
    }
    fileInput.click();
  }

  onDragOver(event: DragEvent): void {
    if (!this.isAdmin()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);

    if (!this.isAdmin()) {
      return;
    }

    this.handleSelectedFile(event.dataTransfer?.files?.[0] ?? null);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handleSelectedFile(input.files?.[0] ?? null);
    // Reset so selecting the exact same file again still fires a change event.
    input.value = '';
  }

  private handleSelectedFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
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

}
