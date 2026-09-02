import { Component, inject, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, FloatLabel, SelectButton, Button],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm {

  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);

  saved = output<void>();
  cancelled = output<void>();

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

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const { isProfessional, ...client } = this.form.getRawValue();

    this.clientService.createClient({
      ...client,
      type: isProfessional ? 'PROFESSIONAL' : 'INDIVIDUAL',
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('client-form : ' + err);
      }
    });
  }

}
