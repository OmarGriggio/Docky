import { Routes } from '@angular/router';
import { ClientListComponent } from './features/clients/client-list/client-list';
import { ClientForm } from './features/clients/client-form/client-form';
import { FournisseurListComponent } from './features/fournisseurs/fournisseur-list/fournisseur-list';
import { FournisseurForm } from './features/fournisseurs/fournisseur-form/fournisseur-form';
import { FactureListComponent } from './features/factures/facture-list/facture-list';
import { FactureLigneListComponent } from './features/factures/facture_ligne-list/facture_ligne-list';
import { OffreListComponent } from './features/offres/offre-list/offre-list';

export const routes: Routes = [
  {
    path: 'clients',
    component: ClientListComponent
  },
  {
    path: 'clients/new',
    component: ClientForm
  },
  {
    path: 'fournisseurs',
    component: FournisseurListComponent
  },
  {
    path: 'fournisseurs/new',
    component: FournisseurForm
  },
  {
    path: 'factures',
    component: FactureListComponent
  },
  {
    path: 'factures-lignes',
    component: FactureLigneListComponent
  },
  {
    path: 'offres',
    component: OffreListComponent
  },
  {
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  }
];