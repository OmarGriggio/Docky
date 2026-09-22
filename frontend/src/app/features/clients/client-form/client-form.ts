import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { ClientService } from '../client.service';
import { Client } from '../../../shared/models/client';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, FloatLabel, SelectButton, Button],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm implements OnInit {

  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);

  // When set (see "Dupliquer" in client-list.ts), pre-fills the form with an
  // existing client's data - everything except `client_number`, which is
  // unique and would fail on submit if duplicated as-is.
  duplicateFrom = input<Client | null>(null);

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
    email: ['', Validators.required],
    phone: [''],
    note: [''],
  });

  typeOptions = [
    { label: 'Particulier', value: false },
    { label: 'Professionnel', value: true }
  ];

  constructor() {
    this.form.controls.isProfessional.valueChanges.subscribe(isProfessional => {
      if (!isProfessional) {
        this.form.patchValue({ company_name: '', vat_number: '' });
      }
    });
  }

  get isProfessional(): boolean {
    return this.form.controls.isProfessional.value;
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
        email: source.email,
        phone: source.phone ?? '',
        note: source.note ?? '',
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

    const { isProfessional, ...client } = this.form.getRawValue();

    this.clientService.createClient({
      ...client,
      type: isProfessional ? 'PROFESSIONAL' : 'INDIVIDUAL',
    }).subscribe({
      next: client => {
        this.saved.emit(client);
      },
      error: (err: HttpErrorResponse) => {
        console.error('client-form : ' + err);
        this.errorMessage.set(this.conflictMessage(err) ?? 'Impossible de créer le client.');
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
      return 'Cet email est déjà utilisé par un autre client.';
    }
    if (err.error?.message === 'Client number already exists') {
      return 'Ce numéro de client existe déjà.';
    }
    return 'Ce client existe déjà.';
  }

}
