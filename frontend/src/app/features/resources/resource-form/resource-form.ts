import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { ResourceService } from '../resource.service';
import { Resource, ResourceType } from '../../../shared/models/resource';

const TYPE_OPTIONS: { label: string; value: ResourceType }[] = [
  { label: 'Matériel', value: 'MATERIAL' },
  { label: 'Service', value: 'SERVICE' },
];

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, FloatLabel, SelectButton, Button],
  templateUrl: './resource-form.html',
})
export class ResourceForm implements OnInit {

  private fb = inject(FormBuilder);
  private resourceService = inject(ResourceService);

  // When set (see "Dupliquer" in resource-list.ts), pre-fills the form with
  // an existing resource's data - everything except `code`, which is unique
  // and would fail on submit if duplicated as-is.
  duplicateFrom = input<Resource | null>(null);

  saved = output<void>();
  cancelled = output<void>();

  typeOptions = TYPE_OPTIONS;

  form = this.fb.nonNullable.group({
    type: ['MATERIAL' as ResourceType, Validators.required],
    code: ['', Validators.required],
    name: ['', Validators.required],
    unit: ['', Validators.required],
    selling_price: [0, Validators.required],
    purchase_price: [null as number | null],
  });

  ngOnInit(): void {
    const source = this.duplicateFrom();
    if (source) {
      this.form.patchValue({
        type: source.type,
        name: source.name,
        unit: source.unit,
        selling_price: source.selling_price,
        purchase_price: source.purchase_price,
      });
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.resourceService.createResource({
      ...this.form.getRawValue(),
      parent_resource_id: null,
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('resource-form : ' + err);
      }
    });
  }

}
