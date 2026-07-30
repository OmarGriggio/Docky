import { Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Button } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { FournisseurService } from '../fournisseur.service';
import { Fournisseur } from '../../../shared/models/fournisseur';
import { FournisseurForm } from '../fournisseur-form/fournisseur-form';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  imports: [TableModule, Menu, Dialog, Button, FournisseurForm],
  templateUrl: './fournisseur-list.html',
  styleUrl: './fournisseur-list.css'
})
export class FournisseurListComponent implements OnInit {

  private fournisseurService = inject(FournisseurService);

  fournisseurs = signal<Fournisseur[]>([]);

  createDialogVisible = signal(false);

  ngOnInit(): void {
    this.loadFournisseurs();
  }

  private loadFournisseurs(): void {
    this.fournisseurService.getFournisseurs().subscribe({
      next: data => {
        this.fournisseurs.set(data);
      },
      error: err => {
        console.error('fournisseur-list : ' + err);
      }
    });
  }

  onFournisseurSaved(): void {
    this.createDialogVisible.set(false);
    this.loadFournisseurs();
  }

  getActions(fournisseur: Fournisseur): MenuItem[] {
    return [
      {
        label: 'Supprimer',
        icon: 'pi pi-trash',
        command: () => this.deleteFournisseur(fournisseur)
      }
    ];
  }

  private deleteFournisseur(fournisseur: Fournisseur): void {
    if (!confirm(`Supprimer le fournisseur ${fournisseur.code_fournisseur} ?`)) {
      return;
    }

    this.fournisseurService.deleteFournisseur(fournisseur.code_fournisseur).subscribe({
      next: () => {
        this.loadFournisseurs();
      },
      error: err => {
        console.error('fournisseur-list : ' + err);
      }
    });
  }

}
