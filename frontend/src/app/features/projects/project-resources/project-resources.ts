import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { ProjectResourceService } from '../project-resource.service';
import { ResourceService } from '../../resources/resource.service';
import { Project } from '../../../shared/models/project';
import { ProjectResource } from '../../../shared/models/project-resource';
import { Resource } from '../../../shared/models/resource';

// The chantier's own resource ledger - born from an accepted quote's lines
// (see document.service.ts's acceptQuoteServ) and adjusted here by hand as
// the project runs (e.g. more hours than planned). Locked once the project
// is COMPLETED - see readonly below - since that's the moment its
// quantities become what an invoice is built from.
@Component({
  selector: 'app-project-resources',
  standalone: true,
  imports: [FormsModule, DecimalPipe, Button, Select, InputNumber],
  templateUrl: './project-resources.html',
})
export class ProjectResources implements OnInit {

  project = input.required<Project>();

  private projectResourceService = inject(ProjectResourceService);
  private resourceService = inject(ResourceService);

  readonly = computed(() => this.project().status === 'COMPLETED');

  resources = signal<Resource[]>([]);
  links = signal<ProjectResource[]>([]);
  loading = signal(true);

  entries = computed(() => {
    const resourceById = new Map(this.resources().map(r => [r.id, r]));
    return this.links()
      .map(link => {
        const resource = resourceById.get(link.resource_id);
        return resource ? { link, resource } : null;
      })
      .filter((entry): entry is { link: ProjectResource; resource: Resource } => entry !== null);
  });

  addableResourceOptions = computed(() => {
    const usedIds = new Set(this.links().map(l => l.resource_id));
    return this.resources()
      .filter(resource => !usedIds.has(resource.id))
      .map(resource => ({ label: resource.name, value: resource.id }));
  });

  newResourceId: number | null = null;
  newResourceQuantity: number | null = null;
  adding = signal(false);

  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.resourceService.getResources().subscribe({
      next: data => this.resources.set(data),
      error: err => console.error('project-resources : ' + err)
    });

    this.loadLinks();
  }

  private loadLinks(): void {
    this.loading.set(true);
    this.projectResourceService.getResourcesForProject(this.project().id).subscribe({
      next: data => {
        this.links.set(data);
        this.loading.set(false);
      },
      error: err => {
        console.error('project-resources : ' + err);
        this.errorMessage.set('Impossible de charger les ressources du chantier.');
        this.loading.set(false);
      }
    });
  }

  updateQuantity(link: ProjectResource, quantity: number | null): void {
    if (quantity === null || quantity === link.quantity) {
      return;
    }

    this.projectResourceService.updateQuantity(link.id, quantity).subscribe({
      next: () => this.loadLinks(),
      error: err => console.error('project-resources : ' + err)
    });
  }

  addResource(): void {
    if (this.newResourceId === null) {
      return;
    }

    this.adding.set(true);
    this.errorMessage.set(null);

    this.projectResourceService.linkResource(this.project().id, this.newResourceId, this.newResourceQuantity ?? 0).subscribe({
      next: () => {
        this.newResourceId = null;
        this.newResourceQuantity = null;
        this.adding.set(false);
        this.loadLinks();
      },
      error: err => {
        console.error('project-resources : ' + err);
        this.errorMessage.set('Impossible d\'ajouter cette ressource.');
        this.adding.set(false);
      }
    });
  }

  removeResource(link: ProjectResource): void {
    this.projectResourceService.unlinkResource(link.id).subscribe({
      next: () => this.loadLinks(),
      error: err => console.error('project-resources : ' + err)
    });
  }

}
