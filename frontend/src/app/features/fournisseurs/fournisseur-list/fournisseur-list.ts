import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { FournisseurService } from '../fournisseur.service';
import { Fournisseur } from '../../../shared/models/fournisseur';
import { FournisseurForm } from '../fournisseur-form/fournisseur-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  imports: [TableModule, Menu, Dialog, Checkbox, FormsModule, Button, FournisseurForm, ConfirmDialogComponent],
  templateUrl: './fournisseur-list.html',
  styleUrl: './fournisseur-list.css'
})
export class FournisseurListComponent implements OnInit {

  private fournisseurService = inject(FournisseurService);

  fournisseurs = signal<Fournisseur[]>([]);
  showArchived = signal(false);

  createDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private fournisseurPendingArchive: Fournisseur | null = null;

  ngOnInit(): void {
    this.loadFournisseurs();
  }

  private loadFournisseurs(): void {
    this.fournisseurService.getFournisseurs(this.showArchived()).subscribe({
      next: data => {
        this.fournisseurs.set(data);
      },
      error: err => {
        console.error('fournisseur-list : ' + err);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadFournisseurs();
  }

  onFournisseurSaved(): void {
    this.createDialogVisible.set(false);
    this.loadFournisseurs();
  }

  getActions(fournisseur: Fournisseur): MenuItem[] {
    return [
      fournisseur.actif
        ? { label: 'Archiver', icon: 'pi pi-trash', command: () => this.archiveFournisseur(fournisseur) }
        : { label: 'Restaurer', icon: 'pi pi-refresh', command: () => this.unarchiveFournisseur(fournisseur) }
    ];
  }

  private archiveFournisseur(fournisseur: Fournisseur): void {
    this.fournisseurPendingArchive = fournisseur;
    this.confirmMessage.set(`Archiver le fournisseur ${fournisseur.code_fournisseur} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const fournisseur = this.fournisseurPendingArchive;
    if (!fournisseur) {
      return;
    }
    this.fournisseurPendingArchive = null;

    this.fournisseurService.archiveFournisseur(fournisseur.id).subscribe({
      next: () => {
        this.loadFournisseurs();
      },
      error: err => {
        console.error('fournisseur-list : ' + err);
      }
    });
  }

  private unarchiveFournisseur(fournisseur: Fournisseur): void {
    this.fournisseurService.unarchiveFournisseur(fournisseur.id).subscribe({
      next: () => {
        this.loadFournisseurs();
      },
      error: err => {
        console.error('fournisseur-list : ' + err);
      }
    });
  }

}
