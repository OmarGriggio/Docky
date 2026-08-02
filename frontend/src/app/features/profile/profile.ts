import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { EntrepriseService } from './entreprise.service';
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
  private entrepriseService = inject(EntrepriseService);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  form = this.fb.nonNullable.group({
    nom_entreprise: ['', Validators.required],
    email: [''],
    telephone: [''],
    iban: [''],
    rue: [''],
    npa: [''],
    ville: [''],
    pays: [''],
    logo: [''],
  });

  loading = signal(true);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  private idEntreprise: number | null = null;

  ngOnInit(): void {
    this.loadEntreprise();
  }

  private loadEntreprise(): void {
    this.loading.set(true);

    this.userService.getUsers().subscribe({
      next: users => {
        const self = users.find(user => user.id === this.authService.currentUser()?.userId);
        this.idEntreprise = self?.id_entreprise ?? null;

        if (this.idEntreprise === null) {
          this.errorMessage.set('Impossible de retrouver votre entreprise.');
          this.loading.set(false);
          return;
        }

        this.entrepriseService.getEntreprise(this.idEntreprise).subscribe({
          next: entreprise => {
            this.form.patchValue({
              nom_entreprise: entreprise.nom_entreprise ?? '',
              email: entreprise.email ?? '',
              telephone: entreprise.telephone ?? '',
              iban: entreprise.iban ?? '',
              rue: entreprise.rue ?? '',
              npa: entreprise.npa ?? '',
              ville: entreprise.ville ?? '',
              pays: entreprise.pays ?? '',
              logo: entreprise.logo ?? '',
            });
            this.loading.set(false);
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
    if (this.form.invalid || this.idEntreprise === null) {
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.entrepriseService.updateEntreprise(this.idEntreprise, this.form.getRawValue()).subscribe({
      next: () => {
        this.successMessage.set('Les données de l\'entreprise ont été mises à jour.');
      },
      error: err => {
        console.error('profile : ' + err);
        this.errorMessage.set('Impossible de mettre à jour les données de l\'entreprise.');
      }
    });
  }

}
