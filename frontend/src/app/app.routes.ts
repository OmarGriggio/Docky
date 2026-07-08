import { Routes } from '@angular/router';
import { ClientListComponent } from './features/clients/client-list/client-list';

export const routes: Routes = [
  {
    path: 'clients',
    component: ClientListComponent
  },
  {
    path: '',
    redirectTo: 'clients',
    pathMatch: 'full'
  }
];