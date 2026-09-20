import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
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

  // Row edit mode (see client-detail.html's editMode="row" and
  // [pEditableRow]) - same pattern as client-list.ts's own
  // onRowEditInit/Save/Cancel: a snapshot per address, keyed by id, taken on
  // init so a cancel (or a failed save) can restore it.
  private clonedAddresses: Record<number, Address> = {};

  onRowEditInit(address: Address): void {
    this.clonedAddresses[address.id] = { ...address };
  }

  onRowEditSave(address: Address): void {
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
        delete this.clonedAddresses[address.id];
      },
      error: err => {
        console.error('client-detail : ' + err);
        this.onRowEditCancel(address);
      }
    });
  }

  onRowEditCancel(address: Address): void {
    const original = this.clonedAddresses[address.id];
    if (original) {
      Object.assign(address, original);
      delete this.clonedAddresses[address.id];
    }
    this.client.update(c => c ? { ...c } : c);
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

}
