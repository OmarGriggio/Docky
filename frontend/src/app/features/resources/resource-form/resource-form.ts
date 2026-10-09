import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { ResourceService } from '../resource.service';
import { Resource, ResourceType } from '../../../shared/models/resource';

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, FloatLabel, SelectButton, Button, TranslocoPipe],
  templateUrl: './resource-form.html',
})
export class ResourceForm implements OnInit {

  private fb = inject(FormBuilder);
  private resourceService = inject(ResourceService);
  private transloco = inject(TranslocoService);

  // When set (see "Dupliquer" in resource-list.ts), pre-fills the form with
  // an existing resource's data - everything except `code`, which is unique
  // and would fail on submit if duplicated as-is.
  duplicateFrom = input<Resource | null>(null);

  saved = output<Resource>();
  cancelled = output<void>();

  errorMessage = signal<string | null>(null);

  private materialLabel = translateSignal('nav.material');
  private serviceLabel = translateSignal('nav.service');

  typeOptions = computed<{ label: string; value: ResourceType }[]>(() => [
    { label: this.materialLabel(), value: 'MATERIAL' },
    { label: this.serviceLabel(), value: 'SERVICE' },
  ]);

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

    this.errorMessage.set(null);

    this.resourceService.createResource({
      ...this.form.getRawValue(),
      parent_resource_id: null,
    }).subscribe({
      next: resource => {
        this.saved.emit(resource);
      },
      error: (err: HttpErrorResponse) => {
        console.error('resource-form : ' + err);
        this.errorMessage.set(this.transloco.translate(
          err.status === 409 ? 'resources.form.codeConflict' : 'resources.form.createError'
        ));
      }
    });
  }

}
