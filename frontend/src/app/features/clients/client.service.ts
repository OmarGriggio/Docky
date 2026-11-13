import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, ClientListItem, ClientWithAddresses } from '../../shared/models/client';
import { Address } from '../../shared/models/address';
import { environment } from '../../../environments/environment';
import { ClientImportRow } from './client-import/import-columns';
import { ImportReport } from './client-import/import-report';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ClientService {

  private http = inject(HttpClient);

  getClients(includeArchived = false) {
    return this.http.get<ClientListItem[]>(`${API_BASE}/client`, {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  getClient(id: number) {
    return this.http.get<ClientWithAddresses>(`${API_BASE}/client/${id}`);
  }

  // language isn't set at creation - the backend defaults it to 'FR', see
  // client.types.ts's own addClientServ parameter type. An address given
  // here becomes the client's primary one, created along with it.
  createClient(
    // No client_number: the backend generates it.
    client: Omit<Client, 'id' | 'is_active' | 'language' | 'is_placeholder' | 'client_number'>,
    address: Pick<Address, 'attention' | 'street' | 'postal_code' | 'city' | 'country'> | null = null,
  ) {
    return this.http.post<Client>(`${API_BASE}/client`, { ...client, address });
  }

  // client_number/is_active/company_id aren't editable this way - see
  // client.types.ts's UpdateClientData on the backend.
  updateClient(id: number, client: Pick<Client, 'type' | 'company_name' | 'last_name' | 'first_name' | 'title' | 'email' | 'phone' | 'note' | 'language'>) {
    return this.http.put<Client>(`${API_BASE}/client/${id}`, client);
  }

  // A spreadsheet's rows (see client-import/): `dryRun` only judges them -
  // the preview. A real import creates them all, or none and answers 422
  // with the same report when a row has an error.
  importClients(rows: ClientImportRow[], defaultCountry: string, language: string, dryRun: boolean) {
    return this.http.post<ImportReport>(`${API_BASE}/client/import`, { rows, defaultCountry, language }, {
      params: dryRun ? { dryRun: 'true' } : {}
    });
  }

  archiveClient(id: number) {
    return this.http.patch<Client>(`${API_BASE}/client/${id}/archive`, {});
  }

  unarchiveClient(id: number) {
    return this.http.patch<Client>(`${API_BASE}/client/${id}/unarchive`, {});
  }
}
