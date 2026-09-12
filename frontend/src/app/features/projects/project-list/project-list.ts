import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Toolbar } from 'primeng/toolbar';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { ProjectService } from '../project.service';
import { ClientService } from '../../clients/client.service';
import { Project } from '../../../shared/models/project';
import { Client } from '../../../shared/models/client';
import { ProjectForm } from '../project-form/project-form';
import { ProjectAttachments } from '../project-attachments/project-attachments';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Menu, Button, Dialog, Checkbox, FormsModule, ProjectForm, ProjectAttachments, ConfirmDialogComponent],
  templateUrl: './project-list.html'
})
export class ProjectListComponent implements OnInit {

  private router = inject(Router);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);

  projects = signal<Project[]>([]);
  clients = signal<Client[]>([]);
  showArchived = signal(false);

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

}
