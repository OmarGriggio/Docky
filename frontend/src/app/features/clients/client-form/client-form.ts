import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, Textarea, FloatLabel, SelectButton, Button, Card],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm {

  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private router = inject(Router);

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
    this.router.navigate(['/clients']);
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
        this.router.navigate(['/clients']);
      },
      error: err => {
        console.error('client-form : ' + err);
      }
    });
  }

}
