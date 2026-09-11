import { Component, computed, inject, input, output, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { DocumentLineService } from '../document-line.service';
import { DocumentLineType } from '../../../shared/models/document-line';
import { DocumentSection } from '../../../shared/models/document-section';

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
export class DocumentLineForm implements OnInit {

  private fb = inject(FormBuilder);
  private documentLineService = inject(DocumentLineService);

  documentId = input.required<number>();
  // The document's sections, so the user picks explicitly which one a new
  // line goes into - a silent default here previously misfiled Service
  // lines under whichever section (usually "Matériel") happened to exist
  // first, since nothing tied the line's type to a section by name.
  sections = input.required<DocumentSection[]>();

  saved = output<void>();
  cancelled = output<void>();

  typeOptions = TYPE_OPTIONS;

  sectionOptions = computed(() =>
    this.sections().map(section => ({ label: section.title, value: section.id }))
  );

  form = this.fb.nonNullable.group({
    section_id: [0, Validators.required],
    type: ['MATERIAL' as DocumentLineType, Validators.required],
    label: ['', Validators.required],
    quantity: [1, Validators.required],
    unit: [''],
    unit_price: [0, Validators.required],
    discount: [0],
  });

  ngOnInit(): void {
    this.form.patchValue({ section_id: this.sections()[0]?.id ?? 0 });
  }

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
