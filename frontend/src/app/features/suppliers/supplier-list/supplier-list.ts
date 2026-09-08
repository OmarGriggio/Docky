import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Toolbar } from 'primeng/toolbar';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { SupplierService } from '../supplier.service';
import { Supplier } from '../../../shared/models/supplier';
import { SupplierForm } from '../supplier-form/supplier-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { archiveActionLabel } from '../../../shared/utils/display';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [TableModule, Toolbar, Menu, Dialog, Checkbox, FormsModule, Button, SupplierForm, ConfirmDialogComponent],
  templateUrl: './supplier-list.html'
})
export class SupplierListComponent implements OnInit {

  private supplierService = inject(SupplierService);
  private router = inject(Router);

  suppliers = signal<Supplier[]>([]);
  showArchived = signal(false);

  createDialogVisible = signal(false);
  // Set when "Dupliquer" is used - passed to <app-supplier-form> so it can
  // pre-fill itself. null means the dialog opened fresh via "Ajouter".
  duplicateSource = signal<Supplier | null>(null);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private supplierPendingArchive: Supplier | null = null;

  ngOnInit(): void {
    this.loadSuppliers();
  }

  private loadSuppliers(): void {
    this.supplierService.getSuppliers(this.showArchived()).subscribe({
      next: data => {
        this.suppliers.set(data);
      },
      error: err => {
        console.error('supplier-list : ' + err);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadSuppliers();
  }

  openCreateDialog(): void {
    this.duplicateSource.set(null);
    this.createDialogVisible.set(true);
  }

  duplicateSupplier(supplier: Supplier): void {
    this.duplicateSource.set(supplier);
    this.createDialogVisible.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogVisible.set(false);
    this.duplicateSource.set(null);
  }

  onSupplierSaved(): void {
    this.closeCreateDialog();
    this.loadSuppliers();
  }

  getActions(supplier: Supplier): MenuItem[] {
    return [
      {
        label: archiveActionLabel(supplier.is_active),
        icon: supplier.is_active ? 'pi pi-trash' : 'pi pi-refresh',
        command: () => supplier.is_active ? this.archiveSupplier(supplier) : this.unarchiveSupplier(supplier)
      },
      {
        label: 'Dupliquer',
        icon: 'pi pi-copy',
        command: () => this.duplicateSupplier(supplier)
      },
      {
        label: 'Détail',
        icon: 'pi pi-eye',
        command: () => this.router.navigate(['/suppliers', supplier.id])
      }
    ];
  }

  private archiveSupplier(supplier: Supplier): void {
    this.supplierPendingArchive = supplier;
    this.confirmMessage.set(`Archiver le fournisseur ${supplier.supplier_code} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const supplier = this.supplierPendingArchive;
    if (!supplier) {
      return;
    }
    this.supplierPendingArchive = null;

    this.supplierService.archiveSupplier(supplier.id).subscribe({
      next: () => {
        this.loadSuppliers();
      },
      error: err => {
        console.error('supplier-list : ' + err);
      }
    });
  }

  private unarchiveSupplier(supplier: Supplier): void {
    this.supplierService.unarchiveSupplier(supplier.id).subscribe({
      next: () => {
        this.loadSuppliers();
      },
      error: err => {
        console.error('supplier-list : ' + err);
      }
    });
  }

}
