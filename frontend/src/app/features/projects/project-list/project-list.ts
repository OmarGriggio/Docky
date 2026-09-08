import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [TableModule, TagModule, Toolbar, Menu, Button, Dialog, Checkbox, FormsModule, ProjectForm, ConfirmDialogComponent],
  templateUrl: './project-list.html'
})
export class ProjectListComponent implements OnInit {

  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);

  projects = signal<Project[]>([]);
  clients = signal<Client[]>([]);
  showArchived = signal(false);

  createDialogVisible = signal(false);
  // Set when "Dupliquer" is used - passed to <app-project-form> so it can
  // pre-fill itself. null means the dialog opened fresh via "Ajouter".
  duplicateSource = signal<Project | null>(null);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private projectPendingArchive: Project | null = null;

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

  openCreateDialog(): void {
    this.duplicateSource.set(null);
    this.createDialogVisible.set(true);
  }

  duplicateProject(project: Project): void {
    this.duplicateSource.set(project);
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
        label: 'Dupliquer',
        command: () => this.duplicateProject(project)
      }
    ];
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
