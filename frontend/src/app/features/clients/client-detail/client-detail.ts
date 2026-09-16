import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule, TableEditCompleteEvent } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Dialog } from 'primeng/dialog';
import { Card } from 'primeng/card';
import { ClientService } from '../client.service';
import { AddressService } from '../../addresses/address.service';
import { ClientWithAddresses } from '../../../shared/models/client';
import { Address } from '../../../shared/models/address';
import { AddressForm } from '../../../shared/components/address-form/address-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [TableModule, Tag, Button, InputText, Dialog, Card, FormsModule, AddressForm, ConfirmDialogComponent],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.css'
})
export class ClientDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientService = inject(ClientService);
  private addressService = inject(AddressService);

  client = signal<ClientWithAddresses | null>(null);
  addAddressDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private addressPendingDelete: Address | null = null;

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

  onAddressSaved(): void {
    this.addAddressDialogVisible.set(false);
    this.loadClient();
  }

  // Resolved via event.index (the row) into c.addresses, and the response
  // is merged into the *same* address object rather than swapping it out -
  // see client-list.ts's own onCellEditComplete for why both of those
  // matter (PrimeNG's own cancel-path logic, and not breaking a same-row
  // edit started right after this one resolves).
  onCellEditComplete(event: TableEditCompleteEvent): void {
    const addresses = this.client()?.addresses;
    const address = addresses && event.index !== undefined ? addresses[event.index] : undefined;
    if (!address) {
      return;
    }

    this.addressService.updateAddress(address.id, {
      attention: address.attention,
      street: address.street,
      postal_code: address.postal_code,
      city: address.city,
      country: address.country,
    }).subscribe({
      next: updated => {
        Object.assign(address, updated);
        this.client.update(c => c ? { ...c } : c);
      },
      error: err => {
        console.error('client-detail : ' + err);
        this.loadClient();
      }
    });
  }

  deleteAddress(address: Address): void {
    this.addressPendingDelete = address;
    this.confirmMessage.set(`Supprimer l'adresse ${address.street}, ${address.city} ?`);
    this.confirmVisible.set(true);
  }

  onDeleteConfirmed(): void {
    const address = this.addressPendingDelete;
    if (!address) {
      return;
    }
    this.addressPendingDelete = null;

    this.addressService.deleteAddress(address.id).subscribe({
      next: () => {
        this.loadClient();
      },
      error: err => {
        console.error('client-detail : ' + err);
      }
    });
  }

  back(): void {
    this.router.navigate(['/clients']);
  }

}
