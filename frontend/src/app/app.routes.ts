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
import { authGuard } from './features/auth/auth.guard';
import { UserListComponent } from './features/admin/user-list/user-list';
import { UserForm } from './features/admin/user-form/user-form';
import { ChantierListComponent } from './features/chantiers/chantier-list/chantier-list';
import { ChantierForm } from './features/chantiers/chantier-form/chantier-form';

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
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN']
    }
  },
  {
    path: 'clients',
    component: ClientListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'clients/new',
    component: ClientForm,
    canActivate: [authGuard]
  },
  {
    path: 'clients/:id',
    component: ClientDetail,
    canActivate: [authGuard]
  },
  {
    path: 'fournisseurs',
    component: FournisseurListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'fournisseurs/new',
    component: FournisseurForm,
    canActivate: [authGuard]
  },
  {
    path: 'documents',
    component: DocumentListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'ressources',
    component: RessourceListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'chantiers',
    component: ChantierListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'chantiers/new',
    component: ChantierForm,
    canActivate: [authGuard]
  },
  {
    path: 'admin/users',
    component: UserListComponent,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN']
    }
  },
  {
    path: 'admin/users/new',
    component: UserForm,
    canActivate: [authGuard, roleGuard],
    data: {
      roles: ['ADMIN']
    }
  },
  {
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  }
];
