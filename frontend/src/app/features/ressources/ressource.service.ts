import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Ressource, RessourceType } from '../../shared/models/ressource';

@Injectable({
  providedIn: 'root'
})
export class RessourceService {

  private http = inject(HttpClient);

  getRessources(type?: RessourceType) {
    return this.http.get<Ressource[]>('http://localhost:3000/ressource', {
      params: type ? { type } : {}
    });
  }

}
