import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Card } from 'primeng/card';
import { SupplierService } from '../supplier.service';
import { AddressService } from '../../addresses/address.service';
import { SupplierWithAddresses } from '../../../shared/models/supplier';
import { Address } from '../../../shared/models/address';
import { AddressForm } from '../../../shared/components/address-form/address-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-supplier-detail',
  standalone: true,
  imports: [TableModule, Tag, Button, Dialog, Card, AddressForm, ConfirmDialogComponent],
  templateUrl: './supplier-detail.html',
  styleUrl: './supplier-detail.css'
})
export class SupplierDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private supplierService = inject(SupplierService);
  private addressService = inject(AddressService);

  supplier = signal<SupplierWithAddresses | null>(null);
  addAddressDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private addressPendingDelete: Address | null = null;

  ngOnInit(): void {
    this.loadSupplier();
  }

  private loadSupplier(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.supplierService.getSupplier(id).subscribe({
      next: data => {
        this.supplier.set(data);
      },
      error: err => {
        console.error('supplier-detail : ' + err);
      }
    });
  }

  onAddressSaved(): void {
    this.addAddressDialogVisible.set(false);
    this.loadSupplier();
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
        this.loadSupplier();
      },
      error: err => {
        console.error('supplier-detail : ' + err);
      }
    });
  }

}
