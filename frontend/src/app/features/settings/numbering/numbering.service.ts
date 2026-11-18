import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API_BASE = environment.apiUrl;

export type NumberedDocumentType = 'QUOTE' | 'INVOICE';

// A company's numbering of one document type (the backend's
// document_numbering.service.ts): its format ("FAC-{YYYY}-{NNNN}"), the
// number it starts from, and the number the next document gets.
export interface DocumentNumbering {
  type: NumberedDocumentType;
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
    return this.http.get<DocumentNumbering[]>(`${API_BASE}/document-numbering`);
  }

  // A 400 with a code (NUMBER_FORMAT_...) for a format that isn't one.
  updateNumbering(type: NumberedDocumentType, settings: NumberingSettings) {
    return this.http.put<DocumentNumbering>(`${API_BASE}/document-numbering/${type}`, settings);
  }

  // The next number with settings not saved yet - nothing is written.
  preview(type: NumberedDocumentType, settings: NumberingSettings) {
    return this.http.post<{ next_number: string }>(`${API_BASE}/document-numbering/${type}/preview`, settings);
  }

}
