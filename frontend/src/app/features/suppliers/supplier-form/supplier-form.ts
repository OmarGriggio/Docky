import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { SupplierService } from '../supplier.service';
import { Supplier } from '../../../shared/models/supplier';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Button],
  templateUrl: './supplier-form.html',
})
export class SupplierForm implements OnInit {

  private fb = inject(FormBuilder);
  private supplierService = inject(SupplierService);

  // When set (see "Dupliquer" in supplier-list.ts), pre-fills the form with
  // an existing supplier's data - everything except `supplier_code`, which
  // is unique and would fail on submit if duplicated as-is.
  duplicateFrom = input<Supplier | null>(null);

  saved = output<void>();
  cancelled = output<void>();

  form = this.fb.nonNullable.group({
    supplier_code: ['', Validators.required],
    name: ['', Validators.required],
    category: [''],
  });

  ngOnInit(): void {
    const source = this.duplicateFrom();
    if (source) {
      this.form.patchValue({
        name: source.name,
        category: source.category,
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

    this.supplierService.createSupplier(this.form.getRawValue()).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('supplier-form : ' + err);
      }
    });
  }

}
