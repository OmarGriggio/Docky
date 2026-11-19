import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.apiUrl;

export type NumberedType = 'QUOTE' | 'INVOICE' | 'CLIENT' | 'MATERIAL' | 'SERVICE';

// A company's numbering of its quotes, invoices, clients, materials or
// services (the backend's numbering.service.ts): its format
// ("FAC-{YYYY}-{NNNN}"), the number it starts from, and the number the next
// one gets.
export interface Numbering {
  type: NumberedType;
  number_format: string;
  start_number: number | null;
  next_number: string;
}

export interface NumberingSettings {
  number_format: string;
  start_number: number | null;
}

@Injectable({ providedIn: 'root' })
export class NumberingService {

  private http = inject(HttpClient);

  getNumbering() {
    return this.http.get<Numbering[]>(`${API_BASE}/numbering`);
  }

  // A 400 with a code (NUMBER_FORMAT_...) for a format that isn't one.
  updateNumbering(type: NumberedType, settings: NumberingSettings) {
    return this.http.put<Numbering>(`${API_BASE}/numbering/${type}`, settings);
  }

  // The next number with settings not saved yet - nothing is written.
  preview(type: NumberedType, settings: NumberingSettings) {
    return this.http.post<{ next_number: string }>(`${API_BASE}/numbering/${type}/preview`, settings);
  }

}
