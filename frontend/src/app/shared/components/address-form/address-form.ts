import { Component, inject, input, OnInit, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Checkbox } from 'primeng/checkbox';
import { AutoComplete } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AddressService } from '../../../features/addresses/address.service';
import { PostalCodeService } from '../../services/postal-code.service';
import { PostalCode, searchPostalCodes } from '../../utils/postal-code-search';

// Currently only used from client-detail.html - its own labels share the
// "clients.detail.address*" keys (see address-form.html) rather than owning
// a duplicate set, since both show the exact same words for the same fields.
@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Checkbox, AutoComplete, Button, TranslocoPipe],
  templateUrl: './address-form.html',
})
export class AddressForm implements OnInit {

  private fb = inject(FormBuilder);
  private addressService = inject(AddressService);
  private postalCodeService = inject(PostalCodeService);
  private transloco = inject(TranslocoService);

  clientId = input.required<number>();

  saved = output<void>();
  cancelled = output<void>();

  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    attention: [''],
    street: ['', Validators.required],
    postal_code: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    is_primary: [false],
  });

  // See client-form.ts's own postal code suggestions.
  private postalCodes: PostalCode[] = [];
  postalCodeSuggestions = signal<(PostalCode & { label: string })[]>([]);

  ngOnInit(): void {
    this.postalCodeService.codes$.subscribe({
      next: codes => this.postalCodes = codes,
      error: err => console.error('address-form : postal codes', err),
    });
  }

  searchPostalCodes(query: string): void {
    this.postalCodeSuggestions.set(
      searchPostalCodes(this.postalCodes, query).map(code => ({ ...code, label: `${code.npa} ${code.town}` }))
    );
  }

  selectPostalCode(code: PostalCode): void {
    this.form.patchValue({ postal_code: code.npa, city: code.town });
  }

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
