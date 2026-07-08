import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FournisseurService } from '../fournisseur.service';

@Component({
  selector: 'app-fournisseur-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './fournisseur-form.html',
})
export class FournisseurForm {

  private fb = inject(FormBuilder);
  private fournisseurService = inject(FournisseurService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    code_fournisseur: ['', Validators.required],
    societe: ['', Validators.required],
    adresse: [''],
    categorie: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.fournisseurService.createFournisseur(this.form.getRawValue()).subscribe({
      next: () => {
        this.router.navigate(['/fournisseurs']);
      },
      error: err => {
        console.error('fournisseur-form : ' + err);
      }
    });
  }

}
