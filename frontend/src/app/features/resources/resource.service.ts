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

  createResource(resource: Omit<Resource, 'id' | 'is_active'>) {
    return this.http.post<Resource>(`${API_BASE}/resource`, resource);
  }

  // type/parent_resource_id/is_active aren't editable this way - see
  // resource.types.ts's UpdateResourceData on the backend.
  updateResource(id: number, resource: Pick<Resource, 'code' | 'name' | 'unit' | 'selling_price' | 'purchase_price'>) {
    return this.http.put<Resource>(`${API_BASE}/resource/${id}`, resource);
  }

  archiveResource(id: number) {
    return this.http.patch<Resource>(`${API_BASE}/resource/${id}/archive`, {});
  }

  unarchiveResource(id: number) {
    return this.http.patch<Resource>(`${API_BASE}/resource/${id}/unarchive`, {});
  }

}
