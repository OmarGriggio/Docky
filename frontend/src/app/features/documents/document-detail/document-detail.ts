import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { DocumentService } from '../document.service';
import { DocumentLineService } from '../document-line.service';
import { ClientService } from '../../clients/client.service';
import { ProjectService } from '../../projects/project.service';
import { Document } from '../../../shared/models/document';
import { DocumentLine } from '../../../shared/models/document-line';
import { Client } from '../../../shared/models/client';
import { Project } from '../../../shared/models/project';
import { DocumentLineForm } from '../document-line-form/document-line-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [TableModule, DecimalPipe, Button, Dialog, Card, Checkbox, FormsModule, Menu, DocumentLineForm, ConfirmDialogComponent],
  templateUrl: './document-detail.html',
  styleUrl: './document-detail.css'
})
export class DocumentDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);
  private documentLineService = inject(DocumentLineService);
  private clientService = inject(ClientService);
  private projectService = inject(ProjectService);

  document = signal<Document | null>(null);
  lines = signal<DocumentLine[]>([]);
  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);

  showArchivedLines = signal(false);
  addLineDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private linePendingArchive: DocumentLine | null = null;

  private clientNames = computed(() => {
    const names = new Map<number, string>();
    for (const client of this.clients()) {
      names.set(client.id, client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim());
    }
    return names;
  });

  private projectNames = computed(() => {
    const names = new Map<number, string>();
    for (const project of this.projects()) {
      names.set(project.id, project.name);
    }
    return names;
  });

  clientName = computed(() => {
    const doc = this.document();
    return doc ? (this.clientNames().get(doc.client_id) ?? '—') : '—';
  });

  projectName = computed(() => {
    const doc = this.document();
    if (!doc || doc.project_id === null) {
      return null;
    }
    return this.projectNames().get(doc.project_id) ?? '—';
  });

  private id!: number;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));

    this.documentService.getDocument(this.id).subscribe({
      next: data => this.document.set(data),
      error: err => console.error('document-detail : ' + err)
    });

    this.clientService.getClients(true).subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-detail : ' + err)
    });

    this.projectService.getProjects(true).subscribe({
      next: data => this.projects.set(data),
      error: err => console.error('document-detail : ' + err)
    });

    this.loadLines();
  }

  private loadLines(): void {
    this.documentLineService.getLines(this.id, this.showArchivedLines()).subscribe({
      next: data => this.lines.set(data),
      error: err => console.error('document-detail : ' + err)
    });
  }

  private reloadDocument(): void {
    this.documentService.getDocument(this.id).subscribe({
      next: data => this.document.set(data),
      error: err => console.error('document-detail : ' + err)
    });
  }

  onShowArchivedLinesChange(value: boolean): void {
    this.showArchivedLines.set(value);
    this.loadLines();
  }

  lineTotal(line: DocumentLine): number {
    return line.quantity * line.unit_price * (1 - line.discount / 100);
  }

  onLineSaved(): void {
    this.addLineDialogVisible.set(false);
    this.loadLines();
    this.reloadDocument();
  }

  getLineActions(line: DocumentLine): MenuItem[] {
    return [
      line.is_active
        ? { label: 'Archiver', command: () => this.archiveLine(line) }
        : { label: 'Restaurer', command: () => this.unarchiveLine(line) }
    ];
  }

  private archiveLine(line: DocumentLine): void {
    this.linePendingArchive = line;
    this.confirmMessage.set(`Archiver la ligne "${line.label}" ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const line = this.linePendingArchive;
    if (!line) {
      return;
    }
    this.linePendingArchive = null;

    this.documentLineService.archiveLine(line.id).subscribe({
      next: () => {
        this.loadLines();
        this.reloadDocument();
      },
      error: err => console.error('document-detail : ' + err)
    });
  }

  private unarchiveLine(line: DocumentLine): void {
    this.documentLineService.unarchiveLine(line.id).subscribe({
      next: () => {
        this.loadLines();
        this.reloadDocument();
      },
      error: err => console.error('document-detail : ' + err)
    });
  }

}
