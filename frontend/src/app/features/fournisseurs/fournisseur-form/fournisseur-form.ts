import { Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

  saved = output<void>();
  cancelled = output<void>();

  form = this.fb.nonNullable.group({
    code_fournisseur: ['', Validators.required],
    societe: ['', Validators.required],
    adresse: [''],
    categorie: [''],
  });

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.fournisseurService.createFournisseur(this.form.getRawValue()).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('fournisseur-form : ' + err);
      }
    });
  }

}
