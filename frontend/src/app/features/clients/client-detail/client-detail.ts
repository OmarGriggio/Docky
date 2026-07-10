import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService } from '../client.service';
import { AdresseService } from '../../adresses/adresse.service';
import { ClientWithAdresses } from '../../../shared/models/client';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './client-detail.html'
})
export class ClientDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private clientService = inject(ClientService);
  private adresseService = inject(AdresseService);
  private fb = inject(FormBuilder);

  client = signal<ClientWithAdresses | null>(null);

  adresseForm = this.fb.nonNullable.group({
    rue: ['', Validators.required],
    npa: [-1, Validators.required],
    ville: ['', Validators.required],
    pays: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadClient();
  }

  private loadClient(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.clientService.getClient(id).subscribe({
      next: data => {
        this.client.set(data);
      },
      error: err => {
        console.error('client-detail : ' + err);
      }
    });
  }

  addAdresse(): void {
    if (this.adresseForm.invalid) {
      return;
    }

    const currentClient = this.client();
    if (!currentClient) {
      return;
    }

    this.adresseService.createAdresse({
      id_client: currentClient.id,
      ...this.adresseForm.getRawValue()
    }).subscribe({
      next: () => {
        this.adresseForm.reset();
        this.loadClient();
      },
      error: err => {
        console.error('client-detail : ' + err);
      }
    });
  }

}
