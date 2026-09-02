import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { DocumentLigneService } from '../document-ligne.service';
import { DocumentLigneType } from '../../../shared/models/document-ligne';

const TYPE_OPTIONS: { label: string; value: DocumentLigneType }[] = [
  { label: 'Matériel', value: 'MATERIEL' },
  { label: 'Service', value: 'SERVICE' },
];

@Component({
  selector: 'app-document-ligne-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, FloatLabel, Select, Button],
  templateUrl: './document-ligne-form.html',
})
export class DocumentLigneForm {

  private fb = inject(FormBuilder);
  private documentLigneService = inject(DocumentLigneService);

  idDocument = input.required<number>();

  saved = output<void>();
  cancelled = output<void>();

  typeOptions = TYPE_OPTIONS;

  form = this.fb.nonNullable.group({
    type: ['MATERIEL' as DocumentLigneType, Validators.required],
    libelle: ['', Validators.required],
    quantite: [1, Validators.required],
    unite: [''],
    prix_unitaire: [0, Validators.required],
    rabais: [0],
  });

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.documentLigneService.createLigne({
      ...this.form.getRawValue(),
      id_document: this.idDocument(),
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('document-ligne-form : ' + err);
      }
    });
  }

}
