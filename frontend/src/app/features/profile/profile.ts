import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { CompanyService } from './company.service';
import { UserService } from '../admin/user.service';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Button, Card],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {

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
  uploadingLogo = signal(false);
  logoErrorMessage = signal<string | null>(null);

  private companyId: number | null = null;

  isAdmin = this.authService.isAdmin;

  ngOnInit(): void {
    this.loadCompany();
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

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file && !['image/jpeg', 'image/png'].includes(file.type)) {
      this.logoErrorMessage.set('Le logo doit être un fichier JPG ou PNG.');
      this.selectedLogoFile.set(null);
      input.value = '';
      return;
    }

    this.logoErrorMessage.set(null);
    this.selectedLogoFile.set(file);
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
