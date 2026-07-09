import { Component, inject, OnInit, signal } from '@angular/core';
import { FactureLigneService } from '../facture_ligne.service';
import { FactureLigne } from '../../../shared/models/facture_ligne';

@Component({
  selector: 'app-facture-ligne-list',
  standalone: true,
  templateUrl: './facture_ligne-list.html'
})
export class FactureLigneListComponent implements OnInit {

  private factureLigneService = inject(FactureLigneService);

  lignes = signal<FactureLigne[]>([]);

  ngOnInit(): void {
    this.factureLigneService.getFacturesLignes().subscribe({
      next: data => {
        this.lignes.set(data);
      },
      error: err => {
        console.error('facture_ligne-list : ' + err);
      }
    });
  }

}
