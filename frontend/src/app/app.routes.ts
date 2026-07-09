import { Routes } from '@angular/router';
import { ClientListComponent } from './features/clients/client-list/client-list';
import { ClientForm } from './features/clients/client-form/client-form';
import { FournisseurListComponent } from './features/fournisseurs/fournisseur-list/fournisseur-list';
import { FournisseurForm } from './features/fournisseurs/fournisseur-form/fournisseur-form';
import { DocumentListComponent } from './features/documents/document-list/document-list';

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
    path: 'documents',
    component: DocumentListComponent
  },
  {
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  }
];
