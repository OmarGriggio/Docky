import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Select } from 'primeng/select';
import { AutoComplete } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { ClientService } from '../client.service';
import { Client, ClientType } from '../../../shared/models/client';
import { TabIndentDirective } from '../../../shared/directives/tab-indent.directive';
import { PostalCodeService } from '../../../shared/services/postal-code.service';
import { PostalCode, searchPostalCodes } from '../../../shared/utils/postal-code-search';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, FloatLabel, SelectButton, Select, AutoComplete, Button, TabIndentDirective, TranslocoPipe],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm implements OnInit {

  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private transloco = inject(TranslocoService);
  private postalCodeService = inject(PostalCodeService);

  // When set (see "Dupliquer" in client-list.ts), pre-fills the form with an
  // existing client's data - everything except `client_number`, which is
  // unique and would fail on submit if duplicated as-is.
  duplicateFrom = input<Client | null>(null);
  // The type a fresh form starts on - the client list's active tab.
  type = input<ClientType>('INDIVIDUAL');

  saved = output<Client>();
  cancelled = output<void>();

  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    client_number: ['', Validators.required],
    isProfessional: [false],
    title: [''],
    last_name: [''],
    first_name: [''],
    company_name: [''],
    vat_number: [''],
    email: [''],
    phone: [''],
    note: [''],
    attention: [''],
    street: [''],
    postal_code: [''],
    city: [''],
  });

  // "Ajouter une adresse" - the address fields are only shown, and required,
  // once asked for.
  showAddress = signal(false);
  private readonly addressRequiredFields = ['street', 'postal_code', 'city'] as const;

  // Loaded the first time the address fields are shown - see
  // PostalCodeService. Until then (or if it fails) the NPA is just typed.
  private postalCodes: PostalCode[] = [];
  postalCodeSuggestions = signal<(PostalCode & { label: string })[]>([]);

  private individualLabel = translateSignal('clients.individual');
  private professionalLabel = translateSignal('clients.professional');

  typeOptions = computed(() => [
    { label: this.professionalLabel(), value: true },
    { label: this.individualLabel(), value: false },
  ]);

  private maleLabel = translateSignal('clients.form.titleMale');
  private femaleLabel = translateSignal('clients.form.titleFemale');
  private unspecifiedLabel = translateSignal('clients.form.titleUnspecified');

  // The value is what's stored in clients.title and printed as is on the
  // PDFs (address block, greeting) - French whatever the UI language.
  titleOptions = computed(() => [
    { label: this.maleLabel(), value: 'Monsieur' },
    { label: this.femaleLabel(), value: 'Madame' },
    { label: this.unspecifiedLabel(), value: 'Madame, Monsieur' },
  ]);

  constructor() {
    this.form.controls.isProfessional.valueChanges.subscribe(isProfessional => {
      if (isProfessional) {
        this.form.patchValue({ last_name: '', first_name: '' });
      } else {
        this.form.patchValue({ company_name: '', vat_number: '' });
      }
    });
  }

  get isProfessional(): boolean {
    return this.form.controls.isProfessional.value;
  }

  toggleAddress(show: boolean): void {
    this.showAddress.set(show);
    if (show && this.postalCodes.length === 0) {
      this.postalCodeService.codes$.subscribe({
        next: codes => this.postalCodes = codes,
        error: err => console.error('client-form : postal codes', err),
      });
    }
    for (const field of this.addressRequiredFields) {
      const control = this.form.controls[field];
      control.setValidators(show ? Validators.required : null);
      control.updateValueAndValidity();
    }
    if (!show) {
      this.form.patchValue({ attention: '', street: '', postal_code: '', city: '' });
    }
  }

  ngOnInit(): void {
    const source = this.duplicateFrom();
    if (source) {
      this.form.patchValue({
        isProfessional: source.type === 'PROFESSIONAL',
        title: source.title ?? '',
        last_name: source.last_name ?? '',
        first_name: source.first_name ?? '',
        company_name: source.company_name ?? '',
        vat_number: source.vat_number ?? '',
        email: source.email ?? '',
        phone: source.phone ?? '',
        note: source.note ?? '',
      });
    } else {
      this.form.patchValue({ isProfessional: this.type() === 'PROFESSIONAL' });
    }
  }

  searchPostalCodes(query: string): void {
    this.postalCodeSuggestions.set(
      searchPostalCodes(this.postalCodes, query).map(code => ({ ...code, label: `${code.npa} ${code.town}` }))
    );
  }

  // The autocomplete has just put the whole suggestion in the control - put
  // the NPA alone back, and the town in its own field.
  selectPostalCode(code: PostalCode): void {
    this.form.patchValue({ postal_code: code.npa, city: code.town });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.errorMessage.set(null);

    const { isProfessional, attention, street, postal_code, city, ...client } = this.form.getRawValue();
    // Only Swiss addresses for now - the country isn't asked, just set
    // (in the UI language; both spellings map for the QR-bill).
    const address = this.showAddress()
      ? {
          attention: attention.trim() || null,
          street: street.trim(),
          postal_code: postal_code.trim(),
          city: city.trim(),
          country: this.transloco.translate('clients.form.defaultCountry'),
        }
      : null;

    this.clientService.createClient({
      ...client,
      email: client.email || null,
      type: isProfessional ? 'PROFESSIONAL' : 'INDIVIDUAL',
    }, address).subscribe({
      next: client => {
        this.saved.emit(client);
      },
      error: (err: HttpErrorResponse) => {
        console.error('client-form : ' + err);
        this.errorMessage.set(this.conflictMessage(err) ?? this.transloco.translate('clients.form.createError'));
      }
    });
  }

  // The backend distinguishes which field actually conflicted (see
  // client.service.ts's addClientServ) - reflected here so the message
  // points at the right one instead of a generic "something's taken".
  private conflictMessage(err: HttpErrorResponse): string | null {
    if (err.status !== 409) {
      return null;
    }
    if (err.error?.message === 'Client email already exists') {
      return this.transloco.translate('clients.form.emailConflict');
    }
    if (err.error?.message === 'Client number already exists') {
      return this.transloco.translate('clients.form.numberConflict');
    }
    return this.transloco.translate('clients.form.genericConflict');
  }

}
