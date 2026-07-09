import { Component, inject, OnInit, signal } from '@angular/core';
import { FactureService } from '../facture.service';
import { Facture } from '../../../shared/models/facture';

@Component({
  selector: 'app-facture-list',
  standalone: true,
  templateUrl: './facture-list.html'
})
export class FactureListComponent implements OnInit {

  private factureService = inject(FactureService);

  factures = signal<Facture[]>([]);

  ngOnInit(): void {
    this.factureService.getFactures().subscribe({
      next: data => {
        this.factures.set(data);
      },
      error: err => {
        console.error('facture-list : ' + err);
      }
    });
  }

}
