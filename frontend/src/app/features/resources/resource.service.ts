import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Resource, ResourceType } from '../../shared/models/resource';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ResourceService {

  private http = inject(HttpClient);

  getResources(type?: ResourceType, includeArchived = false) {
    return this.http.get<Resource[]>(`${API_BASE}/resource`, {
      params: {
        ...(type ? { type } : {}),
        ...(includeArchived ? { includeArchived: 'true' } : {})
      }
    });
  }

  archiveResource(id: number) {
    return this.http.patch<Resource>(`${API_BASE}/resource/${id}/archive`, {});
  }

  unarchiveResource(id: number) {
    return this.http.patch<Resource>(`${API_BASE}/resource/${id}/unarchive`, {});
  }

}
