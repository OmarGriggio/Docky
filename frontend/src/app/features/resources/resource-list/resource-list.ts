import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Toolbar } from 'primeng/toolbar';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { ResourceService } from '../resource.service';
import { Resource, ResourceType } from '../../../shared/models/resource';
import { ResourceForm } from '../resource-form/resource-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

const TYPE_LABELS: Record<ResourceType, string> = {
  'MATERIAL': 'Matériel',
  'SERVICE': 'Service',
};

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [TableModule, Toolbar, Menu, Button, Dialog, Checkbox, FormsModule, ResourceForm, ConfirmDialogComponent],
  templateUrl: './resource-list.html'
})
export class ResourceListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private resourceService = inject(ResourceService);

  resources = signal<Resource[]>([]);
  currentTypeLabel = signal<string | null>(null);
  currentType: ResourceType | null = null;
  showArchived = signal(false);

  createDialogVisible = signal(false);
  // Set when "Dupliquer" is used - passed to <app-resource-form> so it can
  // pre-fill itself. null means the dialog opened fresh via "Ajouter".
  duplicateSource = signal<Resource | null>(null);

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

  openCreateDialog(): void {
    this.duplicateSource.set(null);
    this.createDialogVisible.set(true);
  }

  duplicateResource(resource: Resource): void {
    this.duplicateSource.set(resource);
    this.createDialogVisible.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogVisible.set(false);
    this.duplicateSource.set(null);
  }

  onResourceSaved(): void {
    this.closeCreateDialog();
    this.loadResources();
  }

  getActions(resource: Resource): MenuItem[] {
    return [
      resource.is_active
        ? { label: 'Archiver', command: () => this.archiveResource(resource) }
        : { label: 'Restaurer', command: () => this.unarchiveResource(resource) },
      {
        label: 'Dupliquer',
        command: () => this.duplicateResource(resource)
      }
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
