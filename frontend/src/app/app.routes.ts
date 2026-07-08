import { Routes } from '@angular/router';
import { ClientListComponent } from './features/clients/client-list/client-list';
import { ClientForm } from './features/clients/client-form/client-form';

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
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  }
];