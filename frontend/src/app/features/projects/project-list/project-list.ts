import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, map } from 'rxjs';
import { TableModule, TableEditCompleteEvent } from 'primeng/table';
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
import { DocumentSection } from '../../../shared/models/document-section';
import { Address } from '../../../shared/models/address';
import { ProjectForm } from '../project-form/project-form';
import { ProjectAttachments } from '../project-attachments/project-attachments';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DocumentLedger } from '../../../shared/components/document-ledger/document-ledger';
import { closestDateStart } from '../../../shared/utils/display';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Menu, Button, Dialog, Checkbox, InputText, Select, DatePicker, FormsModule, AppDatePipe, ProjectForm, ProjectAttachments, ConfirmDialogComponent, DocumentLedger],
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

  // "Date" column: the date_start (among a chantier's own sections) closest
  // to today - fetched in one request per chantier once the list itself has
  // loaded (there's no bulk "sections for several documents at once"
  // endpoint - one request per row keeps this self-contained without a
  // backend change, and chantier lists stay small in practice).
  private closestDateByProjectId = signal(new Map<number, string | null>());

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
        this.loadClosestDates(data);
      },
      error: err => {
        console.error("project-list : " + err);
      }
    });
  }

  private loadClosestDates(projects: Project[]): void {
    if (projects.length === 0) {
      this.closestDateByProjectId.set(new Map());
      return;
    }

    const now = Date.now();
    forkJoin(
      projects.map(project =>
        this.documentSectionService.getSections(project.document_id).pipe(
          map(sections => [project.id, closestDateStart(sections, now)] as const)
        )
      )
    ).subscribe({
      next: entries => this.closestDateByProjectId.set(new Map(entries)),
      error: err => console.error("project-list : " + err)
    });
  }

  // '—' when nothing's scheduled yet, same convention as clientName()/
  // location() above for "nothing to show".
  date(project: Project): string | null {
    return this.closestDateByProjectId().get(project.id) ?? null;
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
        : [])
    ];
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

  // Resolved via event.index (the row), not event.data: [pEditableColumn]
  // is bound to each cell's own value (e.g. project.name), matching
  // PrimeNG's own docs/internal cancel-path logic - see client-list.ts's
  // own onCellEditComplete for the same reasoning.
  onCellEditComplete(event: TableEditCompleteEvent): void {
    const project = event.index !== undefined ? this.projects()[event.index] : undefined;
    if (!project) {
      return;
    }

    this.projectService.updateProject(project.id, {
      name: project.name,
      project_type_id: project.project_type_id,
    }).subscribe({
      next: () => this.loadProjects(),
      error: err => {
        console.error('project-list : ' + err);
        this.loadProjects();
      }
    });
  }

  // p-datepicker needs a Date (or null), but date_start/date_end are stored
  // as ISO strings (see shared/models/document-section.ts). Memoized per
  // section object (not just re-parsed on every call): p-datepicker is
  // always mounted here (not just while editing a cell), so its own
  // [ngModel] gets re-evaluated on every change detection cycle - handing
  // it a freshly-allocated `new Date(...)` each time made PrimeNG treat it
  // as an external value change on every single cycle, which itself
  // triggers another cycle, and so on: a real infinite loop that froze the
  // tab the moment a chantier row was expanded. <app-document-ledger>
  // replaces a section wholesale (new object reference) on refresh(), which
  // is exactly when this cache should stop being valid too - a WeakMap
  // keyed by the section object does that for free.
  private sectionDates = new WeakMap<DocumentSection, { start: Date | null; end: Date | null }>();

  private datesFor(section: DocumentSection): { start: Date | null; end: Date | null } {
    let dates = this.sectionDates.get(section);
    if (!dates) {
      dates = {
        start: section.date_start ? new Date(section.date_start) : null,
        end: section.date_end ? new Date(section.date_end) : null,
      };
      this.sectionDates.set(section, dates);
    }
    return dates;
  }

  sectionDateStart(section: DocumentSection): Date | null {
    return this.datesFor(section).start;
  }

  sectionDateEnd(section: DocumentSection): Date | null {
    return this.datesFor(section).end;
  }

  // Picking a date saves right away (no separate "Enregistrer" step). The
  // ledger instance is passed in directly (project-list.html's own
  // #sectionHeader template is projected into <app-document-ledger #ledger>,
  // so `ledger` is in scope there) rather than looked up via a class-level
  // viewChild - a project row's own <app-document-ledger> only exists while
  // that row is expanded, and more than one can be expanded at once, so
  // there's no single static view to query from the component class itself.
  updateSectionDate(section: DocumentSection, field: 'date_start' | 'date_end', value: Date | null, ledger: DocumentLedger): void {
    const iso = value ? value.toISOString() : null;
    const data = {
      date_start: field === 'date_start' ? iso : section.date_start,
      date_end: field === 'date_end' ? iso : section.date_end,
    };

    this.documentSectionService.updateSection(section.id, data).subscribe({
      next: () => ledger.refresh(),
      error: err => {
        console.error('project-list : ' + err);
        ledger.refresh();
      }
    });
  }

}
