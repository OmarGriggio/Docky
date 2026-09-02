import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { ResourceService } from '../resource.service';
import { Resource, ResourceType } from '../../../shared/models/resource';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

const TYPE_LABELS: Record<ResourceType, string> = {
  'MATERIAL': 'Matériel',
  'LABOR': "Main d'oeuvre",
  'SUBCONTRACTING': 'Sous-traitance',
  'OTHER': 'Divers',
};

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [TableModule, Menu, Button, Checkbox, FormsModule, ConfirmDialogComponent],
  templateUrl: './resource-list.html'
})
export class ResourceListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private resourceService = inject(ResourceService);

  resources = signal<Resource[]>([]);
  currentTypeLabel = signal<string | null>(null);
  currentType: ResourceType | null = null;
  showArchived = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private resourcePendingArchive: Resource | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const type = params.get('type') as ResourceType | null;
      this.currentType = type;
      this.currentTypeLabel.set(type ? TYPE_LABELS[type] : null);
      this.loadResources();
    });
  }

  private loadResources(): void {
    this.resourceService.getResources(this.currentType ?? undefined, this.showArchived()).subscribe({
      next: data => {
        this.resources.set(data);
      },
      error: err => {
        console.error('resource-list : ' + err);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadResources();
  }

  getActions(resource: Resource): MenuItem[] {
    return [
      resource.is_active
        ? { label: 'Archiver', command: () => this.archiveResource(resource) }
        : { label: 'Restaurer', command: () => this.unarchiveResource(resource) }
    ];
  }

  private archiveResource(resource: Resource): void {
    this.resourcePendingArchive = resource;
    this.confirmMessage.set(`Archiver la ressource ${resource.name} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const resource = this.resourcePendingArchive;
    if (!resource) {
      return;
    }
    this.resourcePendingArchive = null;

    this.resourceService.archiveResource(resource.id).subscribe({
      next: () => {
        this.loadResources();
      },
      error: err => {
        console.error('resource-list : ' + err);
      }
    });
  }

  private unarchiveResource(resource: Resource): void {
    this.resourceService.unarchiveResource(resource.id).subscribe({
      next: () => {
        this.loadResources();
      },
      error: err => {
        console.error('resource-list : ' + err);
      }
    });
  }

}
