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

  deleteAddress(id: number) {
    return this.http.delete<Address>(`${API_BASE}/address/${id}`);
  }
}
