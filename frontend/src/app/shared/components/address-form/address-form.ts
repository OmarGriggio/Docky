import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { AddressService } from '../../../features/addresses/address.service';

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Checkbox, Button],
  templateUrl: './address-form.html',
})
export class AddressForm {

  private fb = inject(FormBuilder);
  private addressService = inject(AddressService);

  // Exactly one of these two must be set by the parent — this form is used from
  // both the client and the supplier detail page.
  clientId = input<number | null>(null);
  supplierId = input<number | null>(null);

  saved = output<void>();
  cancelled = output<void>();

  form = this.fb.nonNullable.group({
    street: ['', Validators.required],
    postal_code: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    is_primary: [false],
  });

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.addressService.createAddress({
      ...this.form.getRawValue(),
      client_id: this.clientId(),
      supplier_id: this.supplierId(),
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('address-form : ' + err);
      }
    });
  }

}
