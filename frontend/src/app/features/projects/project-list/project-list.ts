import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Toolbar } from 'primeng/toolbar';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProjectService } from '../project.service';
import { ClientService } from '../../clients/client.service';
import { DocumentService } from '../../documents/document.service';
import { DocumentSectionService } from '../../documents/document-section.service';
import { AddressService } from '../../addresses/address.service';
import { Project, ProjectType } from '../../../shared/models/project';
import { Client } from '../../../shared/models/client';
import { Document } from '../../../shared/models/document';
import { Address } from '../../../shared/models/address';
import { ProjectForm } from '../project-form/project-form';
import { ProjectAttachments } from '../project-attachments/project-attachments';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DocumentLedger } from '../../../shared/components/document-ledger/document-ledger';
import { SectionDatePipe } from '../../../shared/pipes/section-date.pipe';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Menu, Button, Dialog, Checkbox, InputText, Select, DatePicker, FormsModule, SectionDatePipe, ProjectForm, ProjectAttachments, ConfirmDialogComponent, DocumentLedger],
  templateUrl: './project-list.html'
})
export class ProjectListComponent implements OnInit {

  private router = inject(Router);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);
  private documentService = inject(DocumentService);
  private documentSectionService = inject(DocumentSectionService);
  private addressService = inject(AddressService);

  projects = signal<Project[]>([]);
  clients = signal<Client[]>([]);
  projectTypes = signal<ProjectType[]>([]);
  // Only used to resolve each project's own address (via its backing
  // PROJECT document's address_id, see shared/models/project.ts) for the
  // "Lieu" column below - never rendered directly.
  private projectDocuments = signal<Document[]>([]);
  private addresses = signal<Address[]>([]);
  showArchived = signal(false);

  typeOptions = computed(() =>
    this.projectTypes().map(type => ({ label: type.label, value: type.id }))
  );

  // Manual chantier creation has no trigger in the UI right now (a chantier
  // only comes from an accepted quote - see the toolbar's comment), but the
  // dialog/form themselves are kept as-is, reachable again by re-adding a
  // single button.
  createDialogVisible = signal(false);
  duplicateSource = signal<Project | null>(null);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private projectPendingArchive: Project | null = null;

  // Computed once, right when the ⋮ button is clicked - see
  // user-list.ts's own openActionsMenu for why a live
  // [model]="getActions(project)" template expression breaks p-menu (it
  // needs a click, then a second one, to actually fire an action).
  menuItems: MenuItem[] = [];

  openActionsMenu(menu: Menu, event: Event, project: Project): void {
    this.menuItems = this.getActions(project);
    menu.toggle(event);
  }

  attachmentsDialogVisible = signal(false);
  attachmentsProject = signal<Project | null>(null);

  completeConfirmVisible = signal(false);
  private projectPendingComplete: Project | null = null;

  // Expandable rows - the row's own expand/collapse state, PrimeNG's usual
  // pattern. A chantier's own sections/lines (its resource ledger) are
  // fetched by <app-document-ledger> once the row is expanded - see
  // shared/components/document-ledger. project-list.html projects its own
  // #sectionHeader template into it, to show editable date pickers instead
  // of that component's default read-only period.
  expandedRowKeys: Record<number, boolean> = {};

  private clientNames = computed(() => {
    const names = new Map<number, string>();
    for (const client of this.clients()) {
      names.set(client.id, client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim());
    }
    return names;
  });

  private projectDocumentsById = computed(() => {
    const documents = new Map<number, Document>();
    for (const document of this.projectDocuments()) {
      documents.set(document.id, document);
    }
    return documents;
  });

  ngOnInit(): void {
    this.loadProjects();

    this.clientService.getClients().subscribe({
      next: data => {
        this.clients.set(data);
      },
      error: err => {
        console.error("project-list : " + err);
      }
    });

    this.projectService.getProjectTypes().subscribe({
      next: data => this.projectTypes.set(data),
      error: err => console.error("project-list : " + err)
    });

    // includeArchived - a closed/archived project's own PROJECT document
    // still needs to resolve for the "Lieu" column.
    this.documentService.getDocuments('PROJECT', true).subscribe({
      next: data => this.projectDocuments.set(data),
      error: err => console.error("project-list : " + err)
    });

    this.addressService.getAddresses().subscribe({
      next: data => this.addresses.set(data),
      error: err => console.error("project-list : " + err)
    });
  }

  private loadProjects(): void {
    this.projectService.getProjects(this.showArchived()).subscribe({
      next: data => {
        this.projects.set(data);
      },
      error: err => {
        console.error("project-list : " + err);
      }
    });
  }

  // '—' when nothing's scheduled yet, same convention as clientName()/
  // location() above for "nothing to show". The list itself already comes
  // back ordered by this same value (see project.repository.ts's
  // getProjectsFromDB) - this is just for display.
  date(project: Project): string | null {
    return project.closest_section_date;
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadProjects();
  }

  clientName(project: Project): string {
    return this.clientNames().get(project.client_id) ?? '—';
  }

  // Same resolution as document-list.ts's own location(): the project's own
  // backing document may have a picked address (address_id), else fall back
  // to the client's primary address, else whichever comes first.
  location(project: Project): string {
    const document = this.projectDocumentsById().get(project.document_id);
    const clientAddresses = this.addresses().filter(a => a.client_id === project.client_id);
    const address = clientAddresses.find(a => a.id === document?.address_id)
      ?? clientAddresses.find(a => a.is_primary)
      ?? clientAddresses[0];
    return address ? `${address.street}, ${address.city}` : '—';
  }

  statusLabel(project: Project): string {
    return project.status === 'COMPLETED' ? 'Terminé' : 'En cours';
  }

  statusSeverity(project: Project): 'success' | 'info' {
    return project.status === 'COMPLETED' ? 'success' : 'info';
  }

  openCreateDialog(): void {
    this.duplicateSource.set(null);
    this.createDialogVisible.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogVisible.set(false);
    this.duplicateSource.set(null);
  }

  onProjectSaved(): void {
    this.closeCreateDialog();
    this.loadProjects();
  }

  getActions(project: Project): MenuItem[] {
    return [
      project.is_active
        ? { label: 'Archiver', command: () => this.archiveProject(project) }
        : { label: 'Restaurer', command: () => this.unarchiveProject(project) },
      {
        label: 'Détail',
        command: () => this.router.navigate(['/projects', project.id])
      },
      {
        label: 'Pièces jointes',
        command: () => this.openAttachmentsDialog(project)
      },
      ...(project.status === 'IN_PROGRESS'
        ? [{ label: 'Clôturer', command: () => this.completeProject(project) }]
        : [{ label: 'Facturer', command: () => this.invoiceProject(project) }])
    ];
  }

  // Only reachable once COMPLETED (the only other status - see
  // shared/models/project.ts's ProjectStatus). Lands on a blank invoice
  // pre-filled from this chantier (document-form.ts's own fromProject query
  // param - same client/project/resource-ledger prefill "Charger chantier"
  // does by hand) rather than creating it directly here - the user still
  // reviews/corrects it before it's actually submitted.
  private invoiceProject(project: Project): void {
    this.router.navigate(['/documents/new'], { queryParams: { type: 'INVOICE', fromProject: project.id } });
  }

  openAttachmentsDialog(project: Project): void {
    this.attachmentsProject.set(project);
    this.attachmentsDialogVisible.set(true);
  }

  private completeProject(project: Project): void {
    this.projectPendingComplete = project;
    this.completeConfirmVisible.set(true);
  }

  onCompleteConfirmed(): void {
    const project = this.projectPendingComplete;
    if (!project) {
      return;
    }
    this.projectPendingComplete = null;

    this.projectService.completeProject(project.id).subscribe({
      next: () => this.loadProjects(),
      error: err => console.error('project-list : ' + err)
    });
  }

  private archiveProject(project: Project): void {
    this.projectPendingArchive = project;
    this.confirmMessage.set(`Archiver le chantier ${project.name} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const project = this.projectPendingArchive;
    if (!project) {
      return;
    }
    this.projectPendingArchive = null;

    this.projectService.archiveProject(project.id).subscribe({
      next: () => {
        this.loadProjects();
      },
      error: err => {
        console.error("project-list : " + err);
      }
    });
  }

  private unarchiveProject(project: Project): void {
    this.projectService.unarchiveProject(project.id).subscribe({
      next: () => {
        this.loadProjects();
      },
      error: err => {
        console.error("project-list : " + err);
      }
    });
  }

  // Triggered from the Type cell editor's own footer (see project-list.html)
  // - creates a new project type on the fly and selects it for this row
  // right away, same as project-form.ts's own "Nouveau type". Doesn't save
  // anything by itself: like picking an existing option, the actual PUT
  // only happens once the cell editor completes (blur/click away/Enter),
  // via onCellEditComplete below.
  addProjectType(project: Project, label: string): void {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }

    this.projectService.createProjectType(trimmed).subscribe({
      next: projectType => {
        this.projectTypes.update(types => [...types, projectType]);
        project.project_type_id = projectType.id;
      },
      error: err => console.error('project-list : ' + err)
    });
  }

  // Row edit mode (see project-list.html's editMode="row" and
  // [pEditableRow]) - a snapshot of each project currently being edited,
  // taken on onRowEditInit, so onRowEditCancel (or a failed save) can
  // restore it. Keyed by id, not held on the project object itself.
  private clonedProjects: Record<number, Project> = {};

  // The "Date" column edits the project's own first section's date_start
  // (see onRowEditSave below), not a real Project field - p-datepicker
  // needs a Date, so this is kept separately rather than repurposing
  // closest_section_date (a string) for two-way binding.
  editingDates: Record<number, Date | null> = {};

  onRowEditInit(project: Project): void {
    this.clonedProjects[project.id] = { ...project };
    this.editingDates[project.id] = project.closest_section_date ? new Date(project.closest_section_date) : null;
  }

  onRowEditSave(project: Project): void {
    const original = this.clonedProjects[project.id];
    const newDate = this.editingDates[project.id] ?? null;
    const newDateIso = newDate ? newDate.toISOString() : null;
    // Compared as parsed dates, not as raw ISO strings - two different ISO
    // strings can still represent the exact same instant, which would
    // otherwise read as "changed" on every save even when the date picker
    // was never touched.
    const originalDate = original?.closest_section_date ? new Date(original.closest_section_date) : null;
    const dateChanged = (newDate?.getTime() ?? null) !== (originalDate?.getTime() ?? null);

    if (!dateChanged) {
      this.saveProjectFields(project, false);
      return;
    }

    // Writes to the first section (by position) of the project's own
    // backing document - a chantier's sections aren't loaded here
    // otherwise (only <app-document-ledger> loads them, once a row is
    // expanded), so this fetches them just for this one write.
    this.documentSectionService.getSections(project.document_id).subscribe({
      next: sections => {
        const first = sections[0];
        if (!first) {
          this.saveProjectFields(project, true);
          return;
        }
        this.documentSectionService.updateSection(first.id, { date_start: newDateIso, date_end: first.date_end }).subscribe({
          next: () => this.saveProjectFields(project, true),
          error: err => {
            console.error('project-list : ' + err);
            this.onRowEditCancel(project);
          }
        });
      },
      error: err => {
        console.error('project-list : ' + err);
        this.onRowEditCancel(project);
      }
    });
  }

  // name/project_type_id are always sent (same "PUT the whole editable
  // shape" convention as elsewhere) - reloadForDate is true once the
  // section's own date_start has already been written above, since that
  // changes closest_section_date/the list's own sort order (see
  // project.repository.ts's getProjectsFromDB) in a way a plain in-place
  // mutation of `project` wouldn't reflect.
  private saveProjectFields(project: Project, reloadForDate: boolean): void {
    this.projectService.updateProject(project.id, {
      name: project.name,
      project_type_id: project.project_type_id,
    }).subscribe({
      next: updated => {
        Object.assign(project, updated);
        delete this.clonedProjects[project.id];
        delete this.editingDates[project.id];
        if (reloadForDate) {
          this.loadProjects();
        } else {
          this.projects.update(projects => [...projects]);
        }
      },
      error: err => {
        console.error('project-list : ' + err);
        this.onRowEditCancel(project);
      }
    });
  }

  onRowEditCancel(project: Project): void {
    const original = this.clonedProjects[project.id];
    if (original) {
      Object.assign(project, original);
      delete this.clonedProjects[project.id];
    }
    delete this.editingDates[project.id];
    this.projects.update(projects => [...projects]);
  }

}
