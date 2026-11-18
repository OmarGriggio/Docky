import { Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { PermissionService } from '../../../shared/services/permission.service';
import { ActivatedRoute } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ProjectService } from '../project.service';
import { ClientService } from '../../clients/client.service';
import { DocumentService } from '../../documents/document.service';
import { Project } from '../../../shared/models/project';
import { Address } from '../../../shared/models/address';
import { ProjectResources } from '../project-resources/project-resources';
import { clientDisplayName } from '../../../shared/utils/display';
import { NotificationService } from '../../../shared/services/notification.service';
import { ProjectBilling } from '../project-billing/project-billing';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

// The chantier's own header (name, client, type, address, status) is
// read-only here - it's set once, either by hand (project-form, currently
// hidden) or auto-filled when an accepted quote creates it (see
// document.service.ts's acceptQuoteServ). What actually changes as a
// project runs is its resources, so that's the one editable thing on this
// page - <app-project-resources> below - along with closing it.
@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [Card, Tag, Button, ProjectResources, ProjectBilling, ConfirmDialogComponent, TranslocoPipe],
  templateUrl: './project-detail.html',
})
export class ProjectDetail implements OnInit {

  private notifications = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private clientService = inject(ClientService);
  private documentService = inject(DocumentService);
  private transloco = inject(TranslocoService);
  private permissions = inject(PermissionService);
  // Closing it with the chantiers module writable; its invoicing card with
  // the invoices module (an employee's permissions).
  canWrite = computed(() => this.permissions.can('projects', 'WRITE'));
  canSeeInvoices = computed(() => this.permissions.can('invoices'));

  project = signal<Project | null>(null);
  clientName = signal<string>('—');
  // The chantier's own address lives on its backing PROJECT document
  // (address_id), not duplicated on the project row itself anymore - same
  // resolution rule as the PDF templates' own resolveAddress on the
  // backend: the document's picked address, falling back to the client's
  // primary one.
  address = signal<Address | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.projectService.getProject(id).subscribe({
      next: project => {
        this.project.set(project);
        this.loadClientAndAddress(project.client_id, project.document_id);
      },
      error: err => this.notifications.error('project-detail', err)
    });
  }

  private loadClientAndAddress(clientId: number, documentId: number): void {
    this.clientService.getClient(clientId).subscribe({
      next: client => {
        this.clientName.set(clientDisplayName(client));

        this.documentService.getDocument(documentId).subscribe({
          next: document => {
            // A chantier for a recipient typed by hand: that recipient, not
            // the "Non défini" placeholder (which has no address at all).
            if (client.is_placeholder && document.recipient_name) {
              this.clientName.set(document.recipient_name);
              this.address.set({
                id: 0,
                client_id: client.id,
                is_primary: true,
                attention: document.recipient_complement,
                street: document.recipient_street ?? '',
                postal_code: document.recipient_postal_code ?? '',
                city: document.recipient_city ?? '',
                country: 'Suisse',
              });
              return;
            }
            const chosen = client.addresses.find(a => a.id === document.address_id);
            this.address.set(chosen ?? client.addresses.find(a => a.is_primary) ?? client.addresses[0] ?? null);
          },
          error: err => this.notifications.error('project-detail', err)
        });
      },
      error: err => this.notifications.error('project-detail', err)
    });
  }

  completeConfirmVisible = signal(false);
  // Closing is refused while its resources are being edited - the chantier
  // would close on what's stored, not on the unsaved lines still on screen.
  resources = viewChild(ProjectResources);

  // Same as the chantiers list's "Clôturer": its resources freeze, the final
  // invoice can be made (the billing card below follows the new status).
  onCompleteConfirmed(): void {
    const project = this.project();
    if (!project) {
      return;
    }
    this.projectService.completeProject(project.id).subscribe({
      next: completed => this.project.set({ ...project, ...completed }),
      error: err => this.notifications.error('project-detail', err)
    });
  }

  statusLabel(project: Project): string {
    return this.transloco.translate(project.status === 'COMPLETED' ? 'projects.statusCompleted' : 'projects.statusInProgress');
  }

  statusSeverity(project: Project): 'success' | 'info' {
    return project.status === 'COMPLETED' ? 'success' : 'info';
  }

}
