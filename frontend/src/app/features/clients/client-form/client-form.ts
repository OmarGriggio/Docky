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
    num_client: ['', Validators.required],
    isProfessionnel: [false],
    civilite: [''],
    nom: [''],
    prenom: [''],
    societe: [''],
    tva: [''],
    email: ['', Validators.required],
    telephone: [''],
    remarque: [''],
  });

  actifOptions = [
    { label: 'Particulier', value: false },
    { label: 'Professionnel', value: true }
  ];

  constructor() {
    this.form.controls.isProfessionnel.valueChanges.subscribe(isProfessionnel => {
      if (!isProfessionnel) {
        this.form.patchValue({ societe: '', tva: '' });
      }
    });
  }

  get isProfessionnel(): boolean {
    return this.form.controls.isProfessionnel.value;
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const { isProfessionnel, ...client } = this.form.getRawValue();

    this.clientService.createClient({
      ...client,
      type: isProfessionnel ? 'PROFESSIONNEL' : 'PARTICULIER',
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
