import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Menu } from 'primeng/menu';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { MenuItem } from 'primeng/api';
import { RessourceService } from '../ressource.service';
import { Ressource, RessourceType } from '../../../shared/models/ressource';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';

const TYPE_LABELS: Record<RessourceType, string> = {
  'MATERIEL': 'Matériel',
  'MAIN-OEUVRE': "Main d'oeuvre",
  'SOUS-TRAITANCE': 'Sous-traitance',
  'DIVERS': 'Divers',
};

@Component({
  selector: 'app-ressource-list',
  standalone: true,
  imports: [TableModule, Menu, Button, Checkbox, FormsModule, ConfirmDialogComponent],
  templateUrl: './ressource-list.html'
})
export class RessourceListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private ressourceService = inject(RessourceService);

  ressources = signal<Ressource[]>([]);
  currentTypeLabel = signal<string | null>(null);
  currentType: RessourceType | null = null;
  showArchived = signal(false);

  confirmVisible = signal(false);
  confirmMessage = signal('');

  private ressourcePendingArchive: Ressource | null = null;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const type = params.get('type') as RessourceType | null;
      this.currentType = type;
      this.currentTypeLabel.set(type ? TYPE_LABELS[type] : null);
      this.loadRessources();
    });
  }

  private loadRessources(): void {
    this.ressourceService.getRessources(this.currentType ?? undefined, this.showArchived()).subscribe({
      next: data => {
        this.ressources.set(data);
      },
      error: err => {
        console.error('ressource-list : ' + err);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadRessources();
  }

  getActions(ressource: Ressource): MenuItem[] {
    return [
      ressource.actif
        ? { label: 'Archiver', command: () => this.archiveRessource(ressource) }
        : { label: 'Restaurer', command: () => this.unarchiveRessource(ressource) }
    ];
  }

  private archiveRessource(ressource: Ressource): void {
    this.ressourcePendingArchive = ressource;
    this.confirmMessage.set(`Archiver la ressource ${ressource.designation} ?`);
    this.confirmVisible.set(true);
  }

  onArchiveConfirmed(): void {
    const ressource = this.ressourcePendingArchive;
    if (!ressource) {
      return;
    }
    this.ressourcePendingArchive = null;

    this.ressourceService.archiveRessource(ressource.id).subscribe({
      next: () => {
        this.loadRessources();
      },
      error: err => {
        console.error('ressource-list : ' + err);
      }
    });
  }

  private unarchiveRessource(ressource: Ressource): void {
    this.ressourceService.unarchiveRessource(ressource.id).subscribe({
      next: () => {
        this.loadRessources();
      },
      error: err => {
        console.error('ressource-list : ' + err);
      }
    });
  }

}
