import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './client-form.html',
  styleUrl: './client-form.css',
})
export class ClientForm {

  private fb = inject(FormBuilder);
  private clientService = inject(ClientService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    code_client: ['', Validators.required],
    nom: ['', Validators.required],
    prenom: [''],
    societe: [''],
    email: [''],
    telephone: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.clientService.createClient(this.form.getRawValue()).subscribe({
      next: () => {
        this.router.navigate(['/clients']);
      },
      error: err => {
        console.error('client-form : ' + err);
      }
    });
  }

}
