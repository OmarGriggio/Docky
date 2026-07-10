import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TableModule } from 'primeng/table';
import { RessourceService } from '../ressource.service';
import { Ressource, RessourceType } from '../../../shared/models/ressource';

const TYPE_LABELS: Record<RessourceType, string> = {
  'MATERIEL': 'Matériel',
  'MAIN-OEUVRE': "Main d'oeuvre",
  'SOUS-TRAITANCE': 'Sous-traitance',
  'DIVERS': 'Divers',
};

@Component({
  selector: 'app-ressource-list',
  standalone: true,
  imports: [TableModule],
  templateUrl: './ressource-list.html'
})
export class RessourceListComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private ressourceService = inject(RessourceService);

  ressources = signal<Ressource[]>([]);
  currentTypeLabel = signal<string | null>(null);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const type = params.get('type') as RessourceType | null;
      this.currentTypeLabel.set(type ? TYPE_LABELS[type] : null);

      this.ressourceService.getRessources(type ?? undefined).subscribe({
        next: data => {
          this.ressources.set(data);
        },
        error: err => {
          console.error('ressource-list : ' + err);
        }
      });
    });
  }

}
