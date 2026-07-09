import { Component, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CatalogueService } from '../catalogue.service';
import { Catalogue } from '../../../shared/models/catalogue';

@Component({
  selector: 'app-catalogue-list',
  standalone: true,
  imports: [TableModule],
  templateUrl: './catalogue-list.html'
})
export class CatalogueListComponent implements OnInit {

  private catalogueService = inject(CatalogueService);

  catalogue = signal<Catalogue[]>([]);

  ngOnInit(): void {
    this.catalogueService.getCatalogue().subscribe({
      next: data => {
        this.catalogue.set(data);
      },
      error: err => {
        console.error('catalogue-list : ' + err);
      }
    });
  }

}
