import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ResourceUnit } from '../../shared/models/resource-unit';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ResourceUnitService {

  private http = inject(HttpClient);

  getUnits() {
    return this.http.get<ResourceUnit[]>(`${API_BASE}/resource-unit`);
  }

  // Get-or-create (see resource_unit.service.ts's addUnitServ on the
  // backend) - picking a typed label that doesn't match any existing
  // option adds it to the company's own list instead of failing.
  createUnit(label: string) {
    return this.http.post<ResourceUnit>(`${API_BASE}/resource-unit`, { label });
  }

}
