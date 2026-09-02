import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { AdresseService } from '../../../features/adresses/adresse.service';

@Component({
  selector: 'app-adresse-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Checkbox, Button],
  templateUrl: './adresse-form.html',
})
export class AdresseForm {

  private fb = inject(FormBuilder);
  private adresseService = inject(AdresseService);

  // Exactly one of these two must be set by the parent — this form is used from
  // both the client and the fournisseur detail page.
  idClient = input<number | null>(null);
  idFournisseur = input<number | null>(null);

  saved = output<void>();
  cancelled = output<void>();

  form = this.fb.nonNullable.group({
    rue: ['', Validators.required],
    npa: ['', Validators.required],
    ville: ['', Validators.required],
    pays: ['', Validators.required],
    principale: [false],
  });

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.adresseService.createAdresse({
      ...this.form.getRawValue(),
      id_client: this.idClient(),
      id_fournisseur: this.idFournisseur(),
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('adresse-form : ' + err);
      }
    });
  }

}
