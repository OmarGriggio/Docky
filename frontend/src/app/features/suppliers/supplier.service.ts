import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Supplier, SupplierWithAddresses } from '../../shared/models/supplier';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class SupplierService {

  private http = inject(HttpClient);

  getSuppliers(includeArchived = false) {
    return this.http.get<Supplier[]>(`${API_BASE}/supplier`, {
      params: includeArchived ? { includeArchived: 'true' } : {}
    });
  }

  getSupplier(id: number) {
    return this.http.get<SupplierWithAddresses>(`${API_BASE}/supplier/${id}`);
  }

  createSupplier(supplier: Omit<Supplier, 'id' | 'is_active'>) {
    return this.http.post<Supplier>(`${API_BASE}/supplier`, supplier);
  }

  archiveSupplier(id: number) {
    return this.http.patch<Supplier>(`${API_BASE}/supplier/${id}/archive`, {});
  }

  unarchiveSupplier(id: number) {
    return this.http.patch<Supplier>(`${API_BASE}/supplier/${id}/unarchive`, {});
  }

}
