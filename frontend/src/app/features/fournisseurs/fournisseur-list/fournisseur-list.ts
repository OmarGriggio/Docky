import { Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { FournisseurService } from '../fournisseur.service';
import { Fournisseur } from '../../../shared/models/fournisseur';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  imports: [TableModule, Menu],
  templateUrl: './fournisseur-list.html'
})
export class FournisseurListComponent implements OnInit {

  private fournisseurService = inject(FournisseurService);

  fournisseurs = signal<Fournisseur[]>([]);

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
