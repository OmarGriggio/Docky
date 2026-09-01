import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { ChantierService } from '../chantier.service';
import { ClientService } from '../../clients/client.service';
import { Chantier } from '../../../shared/models/chantier';
import { Client } from '../../../shared/models/client';
import { ChantierForm } from '../chantier-form/chantier-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-chantier-list',
  standalone: true,
  imports: [TableModule, TagModule, Menu, Button, Dialog, Checkbox, FormsModule, ChantierForm, ConfirmDialogComponent],
  templateUrl: './chantier-list.html',
  styleUrl: './chantier-list.css'
})
export class ChantierListComponent implements OnInit {

  private chantierService = inject(ChantierService);
  private clientService = inject(ClientService);

  chantiers = signal<Chantier[]>([]);
  clients = signal<Client[]>([]);
  showArchived = signal(false);

  createDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private chantierPendingArchive: Chantier | null = null;

  private clientNames = computed(() => {
    const names = new Map<number, string>();
    for (const client of this.clients()) {
      names.set(client.id, client.societe || `${client.prenom ?? ''} ${client.nom ?? ''}`.trim());
    }
    return names;
  });

  ngOnInit(): void {
    this.loadChantiers();

    this.clientService.getClients().subscribe({
      next: data => {
        this.clients.set(data);
      },
      error: err => {
        console.error("chantier-list : " + err);
      }
    });
  }

  private loadChantiers(): void {
    this.chantierService.getChantiers(this.showArchived()).subscribe({
      next: data => {
        this.chantiers.set(data);
      },
      error: err => {
        console.error("chantier-list : " + err);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadChantiers();
  }

  clientName(chantier: Chantier): string {
    return this.clientNames().get(chantier.id_client) ?? '—';
  }

  onChantierSaved(): void {
    this.createDialogVisible.set(false);
    this.loadChantiers();
  }

  getActions(chantier: Chantier): MenuItem[] {
    return [
      chantier.actif
        ? { label: 'Archiver', command: () => this.archiveChantier(chantier) }
        : { label: 'Restaurer', command: () => this.unarchiveChantier(chantier) }
    ];
  }

  private archiveChantier(chantier: Chantier): void {
    this.chantierPendingArchive = chantier;
    this.confirmMessage.set(`Archiver le chantier ${chantier.nom} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const chantier = this.chantierPendingArchive;
    if (!chantier) {
      return;
    }
    this.chantierPendingArchive = null;

    this.chantierService.archiveChantier(chantier.id).subscribe({
      next: () => {
        this.loadChantiers();
      },
      error: err => {
        console.error("chantier-list : " + err);
      }
    });
  }

  private unarchiveChantier(chantier: Chantier): void {
    this.chantierService.unarchiveChantier(chantier.id).subscribe({
      next: () => {
        this.loadChantiers();
      },
      error: err => {
        console.error("chantier-list : " + err);
      }
    });
  }

}
