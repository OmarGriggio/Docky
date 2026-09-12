import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { ProjectService } from '../project.service';
import { ClientService } from '../../clients/client.service';
import { Project } from '../../../shared/models/project';
import { ProjectResources } from '../project-resources/project-resources';
import { clientDisplayName } from '../../../shared/utils/display';

// The chantier's own header (name, client, type, address, status) is
// read-only here - it's set once, either by hand (project-form, currently
// hidden) or auto-filled when an accepted quote creates it (see
// document.service.ts's acceptQuoteServ). What actually changes as a
// project runs is its resources (see zz_migrations/000_base.sql's comment
// on project_resources.quantity), so that's the one editable thing on this
// page - <app-project-resources> below, the same component the project
// list's own dialog used to embed.
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [Card, Tag, Button, ProjectResources],
  templateUrl: './project-detail.html',
})
export class ProjectDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);

  project = signal<Project | null>(null);
  clientName = signal<string>('—');

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.projectService.getProject(id).subscribe({
      next: project => {
        this.project.set(project);
        this.loadClientName(project.client_id);
      },
      error: err => console.error('project-detail : ' + err)
    });
  }

  private loadClientName(clientId: number): void {
    this.clientService.getClient(clientId).subscribe({
      next: client => this.clientName.set(clientDisplayName(client)),
      error: err => console.error('project-detail : ' + err)
    });
  }

  statusLabel(project: Project): string {
    return project.status === 'COMPLETED' ? 'Terminé' : 'En cours';
  }

  statusSeverity(project: Project): 'success' | 'info' {
    return project.status === 'COMPLETED' ? 'success' : 'info';
  }

  back(): void {
    this.router.navigate(['/projects']);
  }

}
