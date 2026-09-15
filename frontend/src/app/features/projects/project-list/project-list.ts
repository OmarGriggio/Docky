import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TableModule, TableEditCompleteEvent, TableRowExpandEvent } from 'primeng/table';
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
import { DocumentLineService } from '../../documents/document-line.service';
import { AddressService } from '../../addresses/address.service';
import { Project, ProjectType } from '../../../shared/models/project';
import { Client } from '../../../shared/models/client';
import { Document } from '../../../shared/models/document';
import { DocumentSection } from '../../../shared/models/document-section';
import { DocumentLine } from '../../../shared/models/document-line';
import { Address } from '../../../shared/models/address';
import { ProjectForm } from '../project-form/project-form';
import { ProjectAttachments } from '../project-attachments/project-attachments';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

// Stable shared references for "nothing yet" - see document-list.ts's own
// EMPTY_SECTIONS/EMPTY_LINES for why (handing a nested p-table a freshly
// allocated [] every change-detection cycle makes it redo its internal
// work non-stop).
const EMPTY_SECTIONS: DocumentSection[] = [];
const EMPTY_LINES: DocumentLine[] = [];

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Menu, Button, Dialog, Checkbox, InputText, Select, DatePicker, FormsModule, ProjectForm, ProjectAttachments, ConfirmDialogComponent],
  templateUrl: './project-list.html'
})
export class ProjectListComponent implements OnInit {

  private router = inject(Router);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);
  private documentService = inject(DocumentService);
  private documentSectionService = inject(DocumentSectionService);
  private documentLineService = inject(DocumentLineService);
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

  attachmentsDialogVisible = signal(false);
  attachmentsProject = signal<Project | null>(null);

  completeConfirmVisible = signal(false);
  private projectPendingComplete: Project | null = null;

  // Expandable rows (same pattern as document-list.ts's own) - a chantier's
  // sections/lines (its resource ledger, see shared/models/project.ts) are
  // fetched lazily, keyed by its backing PROJECT document's id, the first
  // time its row is expanded. Signals, not plain mutated Maps/Sets - see
  // document-list.ts's own comment for why that matters (a real NG0100 was
  // caused by exactly that).
  expandedRowKeys: Record<number, boolean> = {};
  private sectionsByDocumentId = signal(new Map<number, DocumentSection[]>());
  private linesBySectionId = signal(new Map<number, DocumentLine[]>());
  private loadingSectionIds = signal(new Set<number>());

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
    return address?.street ?? '—';
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

  onRowExpand(event: TableRowExpandEvent<Project>): void {
    const documentId = event.data.document_id;
    if (this.sectionsByDocumentId().has(documentId) || this.loadingSectionIds().has(documentId)) {
      return;
    }
    this.fetchSectionsAndLines(documentId);
  }

  // Shared by onRowExpand above (first expand) and onSectionCellEditComplete
  // below (refresh after a date edit) - see document-list.ts's own
  // onRowExpand for the same fetch-both-at-once/group-by-section shape.
  private fetchSectionsAndLines(documentId: number): void {
    this.loadingSectionIds.update(ids => new Set(ids).add(documentId));
    forkJoin({
      sections: this.documentSectionService.getSections(documentId),
      lines: this.documentLineService.getLines(documentId)
    }).subscribe({
      next: ({ sections, lines }) => {
        this.sectionsByDocumentId.update(map => new Map(map).set(documentId, sections));
        this.linesBySectionId.update(map => {
          const next = new Map(map);
          for (const section of sections) {
            next.set(section.id, lines.filter(line => line.section_id === section.id));
          }
          return next;
        });
        this.loadingSectionIds.update(ids => {
          const next = new Set(ids);
          next.delete(documentId);
          return next;
        });
      },
      error: err => {
        console.error('project-list : ' + err);
        this.loadingSectionIds.update(ids => {
          const next = new Set(ids);
          next.delete(documentId);
          return next;
        });
      }
    });
  }

  isLoadingSections(project: Project): boolean {
    return this.loadingSectionIds().has(project.document_id);
  }

  sectionsFor(project: Project): DocumentSection[] {
    return this.sectionsByDocumentId().get(project.document_id) ?? EMPTY_SECTIONS;
  }

  linesFor(section: DocumentSection): DocumentLine[] {
    return this.linesBySectionId().get(section.id) ?? EMPTY_LINES;
  }

  // p-datepicker needs a Date (or null), but date_start/date_end are stored
  // as ISO strings (see shared/models/document-section.ts). Memoized per
  // section object (not just re-parsed on every call): p-datepicker is now
  // always mounted (not just while editing a cell), so its own [ngModel]
  // gets re-evaluated on every change detection cycle - handing it a
  // freshly-allocated `new Date(...)` each time made PrimeNG treat it as an
  // external value change on every single cycle, which itself triggers
  // another cycle, and so on: a real infinite loop that froze the tab the
  // moment a chantier row was expanded. A section is replaced wholesale
  // (new object reference) whenever fetchSectionsAndLines reloads, which is
  // exactly when this cache should stop being valid too - a WeakMap keyed
  // by the section object does that for free.
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

  // Sections/lines here are a read-only glance (see project-list.html's own
  // #expandedrow) - a plain card per section, not a nested p-table, same
  // layout as project-resources.html's own. The schedule is the one thing
  // still directly editable from this list; picking a date saves right
  // away (no separate "Enregistrer" step) and refreshes from the server.
  updateSectionDate(section: DocumentSection, field: 'date_start' | 'date_end', value: Date | null): void {
    const iso = value ? value.toISOString() : null;
    const data = {
      date_start: field === 'date_start' ? iso : section.date_start,
      date_end: field === 'date_end' ? iso : section.date_end,
    };

    this.documentSectionService.updateSection(section.id, data).subscribe({
      next: () => this.fetchSectionsAndLines(section.document_id),
      error: err => {
        console.error('project-list : ' + err);
        this.fetchSectionsAndLines(section.document_id);
      }
    });
  }

}
