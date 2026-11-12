import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AddressService } from '../../../features/addresses/address.service';
import { POSTAL_CODE_CITY_PATTERN, splitPostalCodeCity } from '../../utils/postal-code-search';
import { PostalCodeCity } from '../postal-code-city/postal-code-city';

// Currently only used from client-detail.html - its own labels share the
// "clients.detail.address*" keys (see address-form.html) rather than owning
// a duplicate set, since both show the exact same words for the same fields.
@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Checkbox, PostalCodeCity, Button, TranslocoPipe],
  templateUrl: './address-form.html',
})
export class AddressForm {

  private fb = inject(FormBuilder);
  private addressService = inject(AddressService);
  private transloco = inject(TranslocoService);

  clientId = input.required<number>();

  saved = output<void>();
  cancelled = output<void>();

  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    attention: [''],
    street: ['', Validators.required],
    // "1950 Sion" - split into the address's NPA and town on submit.
    postalCodeCity: ['', [Validators.required, Validators.pattern(POSTAL_CODE_CITY_PATTERN)]],
    country: ['', Validators.required],
    is_primary: [false],
  });

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      // PrimeNG outlines an invalid field in red once it's dirty.
      this.form.markAllAsDirty();
      this.errorMessage.set(this.transloco.translate('common.requiredFields'));
      return;
    }

    this.errorMessage.set(null);
    const { postalCodeCity, ...address } = this.form.getRawValue();
    const { postalCode, city } = splitPostalCodeCity(postalCodeCity);
    this.addressService.createAddress({
      ...address,
      postal_code: postalCode,
      city,
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
