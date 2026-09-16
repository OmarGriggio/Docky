import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Address } from '../../shared/models/address';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class AddressService {

  private http = inject(HttpClient);

  getAddresses() {
    return this.http.get<Address[]>(`${API_BASE}/address`);
  }

  createAddress(address: Omit<Address, 'id'>) {
    return this.http.post<Address>(`${API_BASE}/address`, address);
  }

  // is_primary/client_id aren't editable this way - see address.types.ts's
  // UpdateAddressData on the backend.
  updateAddress(id: number, address: Pick<Address, 'attention' | 'street' | 'postal_code' | 'city' | 'country'>) {
    return this.http.put<Address>(`${API_BASE}/address/${id}`, address);
  }

  deleteAddress(id: number) {
    return this.http.delete<Address>(`${API_BASE}/address/${id}`);
  }
}
