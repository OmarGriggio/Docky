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

  // A code while in the form, turned into the stored clients.title by
  // storedTitle() - see there.
  titleOptions = computed(() => [
    { label: this.maleLabel(), value: 'MALE' },
    { label: this.femaleLabel(), value: 'FEMALE' },
    { label: this.unspecifiedLabel(), value: 'UNSPECIFIED' },
  ]);

  constructor() {
    this.form.controls.isProfessional.valueChanges.subscribe(isProfessional => {
      if (isProfessional) {
        this.form.patchValue({ last_name: '', first_name: '' });
      } else {
        this.form.patchValue({ company_name: '' });
      }
      this.requireName(isProfessional);
    });
  }

  // A professional needs its company name, an individual at least a last
  // name - the one printed on the documents.
  private requireName(isProfessional: boolean): void {
    const { company_name, last_name } = this.form.controls;
    company_name.setValidators(isProfessional ? Validators.required : null);
    last_name.setValidators(isProfessional ? null : Validators.required);
    company_name.updateValueAndValidity({ emitEvent: false });
    last_name.updateValueAndValidity({ emitEvent: false });
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
        title: this.titleCode(source.title),
        last_name: source.last_name ?? '',
        first_name: source.first_name ?? '',
        company_name: source.company_name ?? '',
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
      // PrimeNG outlines an invalid field in red once it's dirty.
      this.form.markAllAsDirty();
      this.errorMessage.set(this.transloco.translate('common.requiredFields'));
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
      title: this.storedTitle(client.title),
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

  // clients.title is printed as is on the PDFs - above an individual's name
  // in the address block, and as the greeting - so it's stored in the UI's
  // language (Monsieur/Madame, Mr/Ms - same as the seeded clients of each
  // company). "Non défini" stores nothing: the address block then has no
  // title line, and the greeting falls back to the client's own language's
  // "Madame, Monsieur" (pdf-labels.ts's defaultClientTitle).
  private storedTitle(code: string): string | null {
    if (code === 'MALE') {
      return this.transloco.translate('clients.form.titleMaleValue');
    }
    if (code === 'FEMALE') {
      return this.transloco.translate('clients.form.titleFemaleValue');
    }
    return null;
  }

  // "Dupliquer": back from a stored title to its option, in either language.
  // Anything else (an older free-text title) starts unselected.
  private titleCode(title: string | null): string {
    if (title === 'Monsieur' || title === 'Mr') {
      return 'MALE';
    }
    if (title === 'Madame' || title === 'Ms') {
      return 'FEMALE';
    }
    return '';
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
