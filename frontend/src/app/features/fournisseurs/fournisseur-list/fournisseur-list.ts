import { Component, inject, OnInit, signal } from '@angular/core';
import { FournisseurService } from '../fournisseur.service';
import { Fournisseur } from '../../../shared/models/fournisseur';

@Component({
  selector: 'app-fournisseur-list',
  standalone: true,
  templateUrl: './fournisseur-list.html'
})
export class FournisseurListComponent implements OnInit {

  private fournisseurService = inject(FournisseurService);

  fournisseurs = signal<Fournisseur[]>([]);

  ngOnInit(): void {
    this.fournisseurService.getFournisseurs().subscribe({
      next: data => {
        this.fournisseurs.set(data);
      },
      error: err => {
        console.error('fournisseur-list : ' + err);
      }
    });
  }

}
