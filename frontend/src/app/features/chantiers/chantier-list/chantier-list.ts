import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { Dialog } from 'primeng/dialog';
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
  imports: [TableModule, Menu, Button, Dialog, ChantierForm, ConfirmDialogComponent],
  templateUrl: './chantier-list.html',
  styleUrl: './chantier-list.css'
})
export class ChantierListComponent implements OnInit {

  private chantierService = inject(ChantierService);
  private clientService = inject(ClientService);

  chantiers = signal<Chantier[]>([]);
  clients = signal<Client[]>([]);

  createDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private chantierPendingDelete: Chantier | null = null;

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
    this.chantierService.getChantiers().subscribe({
      next: data => {
        this.chantiers.set(data);
      },
      error: err => {
        console.error("chantier-list : " + err);
      }
    });
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
      {
        label: 'Supprimer',
        command: () => this.deleteChantier(chantier)
      }
    ];
  }

  private deleteChantier(chantier: Chantier): void {
    this.chantierPendingDelete = chantier;
    this.confirmMessage.set(`Supprimer le chantier ${chantier.nom} ?`);
    this.confirmVisible.set(true);
  }

  onDeleteConfirmed(): void {
    const chantier = this.chantierPendingDelete;
    if (!chantier) {
      return;
    }
    this.chantierPendingDelete = null;

    this.chantierService.deleteChantier(chantier.id).subscribe({
      next: () => {
        this.loadChantiers();
      },
      error: err => {
        console.error("chantier-list : " + err);
      }
    });
  }

}
