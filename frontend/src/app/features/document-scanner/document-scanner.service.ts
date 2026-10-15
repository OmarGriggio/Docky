import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class DocumentScannerService {

  private http = inject(HttpClient);

  // Step 1 of the scanner pipeline - raw text only, no LLM extraction yet
  // (see backend's document-scanner.pdf-text.ts).
  extractText(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ text: string }>(`${API_BASE}/document-scanner/extract-text`, formData);
  }
}
