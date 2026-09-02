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
import { DocumentLigneService } from '../document-ligne.service';
import { ClientService } from '../../clients/client.service';
import { ChantierService } from '../../chantiers/chantier.service';
import { Document } from '../../../shared/models/document';
import { DocumentLigne } from '../../../shared/models/document-ligne';
import { Client } from '../../../shared/models/client';
import { Chantier } from '../../../shared/models/chantier';
import { DocumentLigneForm } from '../document-ligne-form/document-ligne-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-document-detail',
  standalone: true,
  imports: [TableModule, DecimalPipe, Button, Dialog, Card, Checkbox, FormsModule, Menu, DocumentLigneForm, ConfirmDialogComponent],
  templateUrl: './document-detail.html',
  styleUrl: './document-detail.css'
})
export class DocumentDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);
  private documentLigneService = inject(DocumentLigneService);
  private clientService = inject(ClientService);
  private chantierService = inject(ChantierService);

  document = signal<Document | null>(null);
  lignes = signal<DocumentLigne[]>([]);
  clients = signal<Client[]>([]);
  chantiers = signal<Chantier[]>([]);

  showArchivedLignes = signal(false);
  addLigneDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private lignePendingArchive: DocumentLigne | null = null;

  private clientNames = computed(() => {
    const names = new Map<number, string>();
    for (const client of this.clients()) {
      names.set(client.id, client.societe || `${client.prenom ?? ''} ${client.nom ?? ''}`.trim());
    }
    return names;
  });

  private chantierNames = computed(() => {
    const names = new Map<number, string>();
    for (const chantier of this.chantiers()) {
      names.set(chantier.id, chantier.nom);
    }
    return names;
  });

  clientName = computed(() => {
    const doc = this.document();
    return doc ? (this.clientNames().get(doc.id_client) ?? '—') : '—';
  });

  chantierName = computed(() => {
    const doc = this.document();
    if (!doc || doc.id_chantier === null) {
      return null;
    }
    return this.chantierNames().get(doc.id_chantier) ?? '—';
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

    this.chantierService.getChantiers(true).subscribe({
      next: data => this.chantiers.set(data),
      error: err => console.error('document-detail : ' + err)
    });

    this.loadLignes();
  }

  private loadLignes(): void {
    this.documentLigneService.getLignes(this.id, this.showArchivedLignes()).subscribe({
      next: data => this.lignes.set(data),
      error: err => console.error('document-detail : ' + err)
    });
  }

  private reloadDocument(): void {
    this.documentService.getDocument(this.id).subscribe({
      next: data => this.document.set(data),
      error: err => console.error('document-detail : ' + err)
    });
  }

  onShowArchivedLignesChange(value: boolean): void {
    this.showArchivedLignes.set(value);
    this.loadLignes();
  }

  ligneTotal(ligne: DocumentLigne): number {
    return ligne.quantite * ligne.prix_unitaire * (1 - ligne.rabais / 100);
  }

  onLigneSaved(): void {
    this.addLigneDialogVisible.set(false);
    this.loadLignes();
    this.reloadDocument();
  }

  getLigneActions(ligne: DocumentLigne): MenuItem[] {
    return [
      ligne.actif
        ? { label: 'Archiver', command: () => this.archiveLigne(ligne) }
        : { label: 'Restaurer', command: () => this.unarchiveLigne(ligne) }
    ];
  }

  private archiveLigne(ligne: DocumentLigne): void {
    this.lignePendingArchive = ligne;
    this.confirmMessage.set(`Archiver la ligne "${ligne.libelle}" ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const ligne = this.lignePendingArchive;
    if (!ligne) {
      return;
    }
    this.lignePendingArchive = null;

    this.documentLigneService.archiveLigne(ligne.id).subscribe({
      next: () => {
        this.loadLignes();
        this.reloadDocument();
      },
      error: err => console.error('document-detail : ' + err)
    });
  }

  private unarchiveLigne(ligne: DocumentLigne): void {
    this.documentLigneService.unarchiveLigne(ligne.id).subscribe({
      next: () => {
        this.loadLignes();
        this.reloadDocument();
      },
      error: err => console.error('document-detail : ' + err)
    });
  }

}
