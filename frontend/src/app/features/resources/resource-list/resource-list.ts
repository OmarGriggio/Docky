import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Toolbar } from 'primeng/toolbar';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { MenuItem } from 'primeng/api';
import { ResourceService } from '../resource.service';
import { Resource, ResourceType } from '../../../shared/models/resource';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { formatPrice, matchesSearch } from '../../../shared/utils/display';
import { ResourceForm } from '../resource-form/resource-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

const TYPE_LABELS: Record<ResourceType, string> = {
  'MATERIAL': 'Matériel',
  'SERVICE': 'Service',
};

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [TableModule, InputText, InputNumber, Toolbar, Menu, Button, Dialog, IconField, InputIcon, FormsModule, PricePipe, ResourceForm, ConfirmDialogComponent],
  templateUrl: './resource-list.html'
})
export class ResourceListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private resourceService = inject(ResourceService);

  resources = signal<Resource[]>([]);
  currentTypeLabel = signal<string | null>(null);
  currentType: ResourceType | null = null;
  showArchived = signal(false);

  // The toolbar's search box - matches any column of the table (code,
  // designation, unit, selling and purchase price as displayed), each typed
  // word anywhere among them. Done in the browser on the already-loaded
  // list.
  search = signal('');
  filteredResources = computed(() =>
    this.resources().filter(resource => matchesSearch(this.searchableText(resource), this.search()))
  );

  private searchableText(resource: Resource): string {
    return [
      resource.code,
      resource.name,
      resource.unit,
      formatPrice(resource.selling_price),
      formatPrice(resource.purchase_price),
    ].filter(Boolean).join(' ');
  }

  createDialogVisible = signal(false);
  // Set when "Dupliquer" is used - passed to <app-resource-form> so it can
  // pre-fill itself. null means the dialog opened fresh via "Ajouter".
  duplicateSource = signal<Resource | null>(null);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private resourcePendingArchive: Resource | null = null;

  // Computed once, right when the ⋮ button is clicked - see
  // user-list.ts's own openActionsMenu for why a live
  // [model]="getActions(item)" template expression breaks p-menu (it
  // needs a click, then a second one, to actually fire an action).
  menuItems: MenuItem[] = [];

  openActionsMenu(menu: Menu, event: Event, resource: Resource): void {
    this.menuItems = this.getActions(resource);
    menu.toggle(event);
  }

  // The toolbar's own ⋮ menu (list-wide options, unlike the per-row one
  // above) - built on click for the same reason as menuItems: its label
  // depends on the current showArchived() state.
  toolbarMenuItems: MenuItem[] = [];

  openToolbarMenu(menu: Menu, event: Event): void {
    this.toolbarMenuItems = [
      {
        label: this.showArchived() ? 'Masquer les archivés' : 'Afficher les archivés',
        icon: 'pi pi-archive',
        command: () => this.onShowArchivedChange(!this.showArchived())
      }
    ];
    menu.toggle(event);
  }

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

  // Row edit mode (see resource-list.html's editMode="row" and
  // [pEditableRow]) - a snapshot of each resource currently being edited,
  // taken on onRowEditInit, so onRowEditCancel (or a failed save) can
  // restore it. Keyed by id, not held on the resource object itself.
  private clonedResources: Record<number, Resource> = {};

  onRowEditInit(resource: Resource): void {
    this.clonedResources[resource.id] = { ...resource };
  }

  onRowEditSave(resource: Resource): void {
    this.resourceService.updateResource(resource.id, {
      code: resource.code,
      name: resource.name,
      unit: resource.unit,
      selling_price: resource.selling_price,
      purchase_price: resource.purchase_price,
    }).subscribe({
      // Mutate the *same* resource object in place (see client-list.ts's
      // own onRowEditSave for why a new object - even id-equal - matters
      // here).
      next: updated => {
        Object.assign(resource, updated);
        this.resources.update(resources => [...resources]);
        delete this.clonedResources[resource.id];
      },
      error: err => {
        console.error('resource-list : ' + err);
        this.onRowEditCancel(resource);
      }
    });
  }

  onRowEditCancel(resource: Resource): void {
    const original = this.clonedResources[resource.id];
    if (original) {
      Object.assign(resource, original);
      delete this.clonedResources[resource.id];
    }
    this.resources.update(resources => [...resources]);
  }

}
