import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule, TableEditCompleteEvent } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Toolbar } from 'primeng/toolbar';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProjectService } from '../project.service';
import { ClientService } from '../../clients/client.service';
import { Project, ProjectType } from '../../../shared/models/project';
import { Client } from '../../../shared/models/client';
import { ProjectForm } from '../project-form/project-form';
import { ProjectAttachments } from '../project-attachments/project-attachments';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Menu, Button, Dialog, Checkbox, InputText, Select, FormsModule, ProjectForm, ProjectAttachments, ConfirmDialogComponent],
  templateUrl: './project-list.html'
})
export class ProjectListComponent implements OnInit {

  private router = inject(Router);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);

  projects = signal<Project[]>([]);
  clients = signal<Client[]>([]);
  projectTypes = signal<ProjectType[]>([]);
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

  private clientNames = computed(() => {
    const names = new Map<number, string>();
    for (const client of this.clients()) {
      names.set(client.id, client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim());
    }
    return names;
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

}
