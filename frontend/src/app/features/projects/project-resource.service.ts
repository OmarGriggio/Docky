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

  linkResource(project_id: number, resource_id: number) {
    return this.http.post<ProjectResource>(`${API_BASE}/project-resource`, { project_id, resource_id });
  }

  unlinkResource(id: number) {
    return this.http.delete<ProjectResource>(`${API_BASE}/project-resource/${id}`);
  }

}
