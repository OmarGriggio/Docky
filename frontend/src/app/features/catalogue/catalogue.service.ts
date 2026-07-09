import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Catalogue, CatalogueType } from '../../shared/models/catalogue';

@Injectable({
  providedIn: 'root'
})
export class CatalogueService {

  private http = inject(HttpClient);

  getCatalogue(type?: CatalogueType) {
    return this.http.get<Catalogue[]>('http://localhost:3000/catalogue', {
      params: type ? { type } : {}
    });
  }

}
