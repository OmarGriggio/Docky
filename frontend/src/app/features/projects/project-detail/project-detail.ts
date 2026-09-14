import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { ProjectService } from '../project.service';
import { ClientService } from '../../clients/client.service';
import { DocumentService } from '../../documents/document.service';
import { Project } from '../../../shared/models/project';
import { Address } from '../../../shared/models/address';
import { ProjectResources } from '../project-resources/project-resources';
import { clientDisplayName } from '../../../shared/utils/display';

// The chantier's own header (name, client, type, address, status) is
// read-only here - it's set once, either by hand (project-form, currently
// hidden) or auto-filled when an accepted quote creates it (see
// document.service.ts's acceptQuoteServ). What actually changes as a
// project runs is its resources, so that's the one editable thing on this
// page - <app-project-resources> below.
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
  private documentService = inject(DocumentService);

  project = signal<Project | null>(null);
  clientName = signal<string>('—');
  // The chantier's own address lives on its backing PROJECT document
  // (address_id), not duplicated on the project row itself anymore - same
  // resolution rule as the PDF templates' own resolveAddress on the
  // backend: the document's picked address, falling back to the client's
  // primary one.
  address = signal<Address | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.projectService.getProject(id).subscribe({
      next: project => {
        this.project.set(project);
        this.loadClientAndAddress(project.client_id, project.document_id);
      },
      error: err => console.error('project-detail : ' + err)
    });
  }

  private loadClientAndAddress(clientId: number, documentId: number): void {
    this.clientService.getClient(clientId).subscribe({
      next: client => {
        this.clientName.set(clientDisplayName(client));

        this.documentService.getDocument(documentId).subscribe({
          next: document => {
            const chosen = client.addresses.find(a => a.id === document.address_id);
            this.address.set(chosen ?? client.addresses.find(a => a.is_primary) ?? client.addresses[0] ?? null);
          },
          error: err => console.error('project-detail : ' + err)
        });
      },
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
