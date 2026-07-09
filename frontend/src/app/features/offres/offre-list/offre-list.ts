import { Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { OffreService } from '../offre.service';
import { Offre } from '../../../shared/models/offre';

@Component({
  selector: 'app-offre-list',
  standalone: true,
  imports: [TableModule],
  templateUrl: './offre-list.html'
})
export class OffreListComponent implements OnInit {

  private offreService = inject(OffreService);

  offres = signal<Offre[]>([]);

  ngOnInit(): void {
    this.offreService.getOffres().subscribe({
      next: data => {
        this.offres.set(data);
      },
      error: err => {
        console.error('offre-list : ' + err);
      }
    });
  }

}
