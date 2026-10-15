import { Component, inject, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { DocumentScannerService, ExtractedDocumentData } from './document-scanner.service';

// Throwaway test page for the document-scanner feature - upload a PDF, see
// both the raw text sent to the LLM and its structured extraction. No real
// form prefill yet - just proof that the whole pipeline works end to end.
@Component({
  selector: 'app-document-scanner',
  standalone: true,
  imports: [Button, JsonPipe],
  templateUrl: './document-scanner.html',
})
export class DocumentScanner {

  private scannerService = inject(DocumentScannerService);

  selectedFile = signal<File | null>(null);
  extractedText = signal<string | null>(null);
  extractedData = signal<ExtractedDocumentData | null>(null);
  errorMessage = signal<string | null>(null);
  loading = signal(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.extractedText.set(null);
    this.extractedData.set(null);
    this.errorMessage.set(null);
  }

  scan(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.scannerService.extractText(file).subscribe({
      next: result => this.extractedText.set(result.text),
      error: (err: HttpErrorResponse) => {
        console.error('document-scanner : ' + err);
        this.errorMessage.set('Impossible d\'extraire le texte de ce PDF.');
      }
    });

    this.scannerService.scan(file).subscribe({
      next: result => {
        this.extractedData.set(result);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('document-scanner : ' + err);
        this.errorMessage.set('Impossible d\'extraire les donnees de ce PDF.');
        this.loading.set(false);
      }
    });
  }
}
