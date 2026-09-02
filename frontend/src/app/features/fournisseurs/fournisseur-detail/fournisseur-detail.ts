import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Card } from 'primeng/card';
import { FournisseurService } from '../fournisseur.service';
import { AdresseService } from '../../adresses/adresse.service';
import { FournisseurWithAdresses } from '../../../shared/models/fournisseur';
import { Adresse } from '../../../shared/models/adresse';
import { AdresseForm } from '../../../shared/components/adresse-form/adresse-form';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-fournisseur-detail',
  standalone: true,
  imports: [TableModule, Tag, Button, Dialog, Card, AdresseForm, ConfirmDialogComponent],
  templateUrl: './fournisseur-detail.html',
  styleUrl: './fournisseur-detail.css'
})
export class FournisseurDetail implements OnInit {

  private route = inject(ActivatedRoute);
  private fournisseurService = inject(FournisseurService);
  private adresseService = inject(AdresseService);

  fournisseur = signal<FournisseurWithAdresses | null>(null);
  addAdresseDialogVisible = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private adressePendingDelete: Adresse | null = null;

  ngOnInit(): void {
    this.loadFournisseur();
  }

  private loadFournisseur(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.fournisseurService.getFournisseur(id).subscribe({
      next: data => {
        this.fournisseur.set(data);
      },
      error: err => {
        console.error('fournisseur-detail : ' + err);
      }
    });
  }

  onAdresseSaved(): void {
    this.addAdresseDialogVisible.set(false);
    this.loadFournisseur();
  }

  deleteAdresse(adresse: Adresse): void {
    this.adressePendingDelete = adresse;
    this.confirmMessage.set(`Supprimer l'adresse ${adresse.rue}, ${adresse.ville} ?`);
    this.confirmVisible.set(true);
  }

  onDeleteConfirmed(): void {
    const adresse = this.adressePendingDelete;
    if (!adresse) {
      return;
    }
    this.adressePendingDelete = null;

    this.adresseService.deleteAdresse(adresse.id).subscribe({
      next: () => {
        this.loadFournisseur();
      },
      error: err => {
        console.error('fournisseur-detail : ' + err);
      }
    });
  }

}
