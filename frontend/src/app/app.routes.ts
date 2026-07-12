import { Routes } from '@angular/router';
import { ClientListComponent } from './features/clients/client-list/client-list';
import { ClientForm } from './features/clients/client-form/client-form';
import { ClientDetail } from './features/clients/client-detail/client-detail';
import { FournisseurListComponent } from './features/fournisseurs/fournisseur-list/fournisseur-list';
import { FournisseurForm } from './features/fournisseurs/fournisseur-form/fournisseur-form';
import { DocumentListComponent } from './features/documents/document-list/document-list';
import { RessourceListComponent } from './features/ressources/ressource-list/ressource-list';
import { UiTest } from './features/uitest/uitest';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { roleGuard } from './features/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'uitest',
    component: UiTest,
    canActivate: [roleGuard],
    data: {
      roles: ['ADMIN']
    }
  },
  {
    path: 'clients',
    component: ClientListComponent
  },
  {
    path: 'clients/new',
    component: ClientForm
  },
  {
    path: 'clients/:id',
    component: ClientDetail
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
    path: 'ressources',
    component: RessourceListComponent
  },
  {
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  }
];
