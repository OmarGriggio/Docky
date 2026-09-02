import { Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { SupplierService } from '../supplier.service';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Button],
  templateUrl: './supplier-form.html',
})
export class SupplierForm {

  private fb = inject(FormBuilder);
  private supplierService = inject(SupplierService);

  saved = output<void>();
  cancelled = output<void>();

  form = this.fb.nonNullable.group({
    supplier_code: ['', Validators.required],
    name: ['', Validators.required],
    category: [''],
  });

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
