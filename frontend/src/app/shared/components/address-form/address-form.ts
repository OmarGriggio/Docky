import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { AddressService } from '../../../features/addresses/address.service';

// Currently only used from client-detail.html - its own labels share the
// "clients.detail.address*" keys (see address-form.html) rather than owning
// a duplicate set, since both show the exact same words for the same fields.
@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Checkbox, Button, TranslocoPipe],
  templateUrl: './address-form.html',
})
export class AddressForm {

  private fb = inject(FormBuilder);
  private addressService = inject(AddressService);

  clientId = input.required<number>();

  saved = output<void>();
  cancelled = output<void>();

  form = this.fb.nonNullable.group({
    attention: [''],
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
