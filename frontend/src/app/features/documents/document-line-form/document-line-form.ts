import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { DocumentLineService } from '../document-line.service';
import { DocumentLineType } from '../../../shared/models/document-line';

const TYPE_OPTIONS: { label: string; value: DocumentLineType }[] = [
  { label: 'Matériel', value: 'MATERIAL' },
  { label: 'Service', value: 'SERVICE' },
];

@Component({
  selector: 'app-document-line-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, FloatLabel, Select, Button],
  templateUrl: './document-line-form.html',
})
export class DocumentLineForm {

  private fb = inject(FormBuilder);
  private documentLineService = inject(DocumentLineService);

  documentId = input.required<number>();

  saved = output<void>();
  cancelled = output<void>();

  typeOptions = TYPE_OPTIONS;

  form = this.fb.nonNullable.group({
    type: ['MATERIAL' as DocumentLineType, Validators.required],
    label: ['', Validators.required],
    quantity: [1, Validators.required],
    unit: [''],
    unit_price: [0, Validators.required],
    discount: [0],
  });

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.documentLineService.createLine({
      ...this.form.getRawValue(),
      document_id: this.documentId(),
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('document-line-form : ' + err);
      }
    });
  }

}
