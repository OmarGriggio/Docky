import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Project, CreateProjectPayload, ProjectType } from '../../shared/models/project';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private http = inject(HttpClient);

  getProjects(includeArchived = false) {
    return this.http.get<Project[]>(`${API_BASE}/project`, {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  createProject(project: CreateProjectPayload) {
    return this.http.post<Project>(`${API_BASE}/project`, project);
  }

  archiveProject(id: number) {
    return this.http.patch<Project>(`${API_BASE}/project/${id}/archive`, {});
  }

  unarchiveProject(id: number) {
    return this.http.patch<Project>(`${API_BASE}/project/${id}/unarchive`, {});
  }

  getProjectTypes() {
    return this.http.get<ProjectType[]>(`${API_BASE}/project-type`);
  }

  createProjectType(label: string) {
    return this.http.post<ProjectType>(`${API_BASE}/project-type`, { label });
  }
}
