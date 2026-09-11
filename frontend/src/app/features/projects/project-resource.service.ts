import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ProjectResource } from '../../shared/models/project-resource';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ProjectResourceService {

  private http = inject(HttpClient);

  getResourcesForProject(project_id: number) {
    return this.http.get<ProjectResource[]>(`${API_BASE}/project-resource`, {
      params: { project_id }
    });
  }

  // quantity/unit_price are optional here for the manual "link a resource by
  // hand" case (e.g. adding an unplanned resource to an in-progress project)
  // - the backend defaults quantity to 0 and unit_price to the resource's
  // current catalog price when omitted. The normal path (an accepted quote)
  // sets both server-side, not through this method.
  linkResource(project_id: number, resource_id: number, quantity?: number, unit_price?: number) {
    return this.http.post<ProjectResource>(`${API_BASE}/project-resource`, { project_id, resource_id, quantity, unit_price });
  }

  updateQuantity(id: number, quantity: number) {
    return this.http.patch<ProjectResource>(`${API_BASE}/project-resource/${id}`, { quantity });
  }

  unlinkResource(id: number) {
    return this.http.delete<ProjectResource>(`${API_BASE}/project-resource/${id}`);
  }

}
