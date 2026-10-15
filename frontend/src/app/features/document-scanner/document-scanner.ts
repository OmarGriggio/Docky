import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Button } from 'primeng/button';
import { DocumentScannerService } from './document-scanner.service';

// Throwaway test page for the document-scanner feature - upload a PDF, see
// the raw extracted text. No LLM call yet, no real form prefill - just
// proof that the upload -> text-extraction pipeline works end to end.
@Component({
  selector: 'app-document-scanner',
  standalone: true,
  imports: [Button],
  templateUrl: './document-scanner.html',
})
export class DocumentScanner {

  private scannerService = inject(DocumentScannerService);

  selectedFile = signal<File | null>(null);
  extractedText = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  loading = signal(false);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
    this.extractedText.set(null);
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
      next: result => {
        this.extractedText.set(result.text);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('document-scanner : ' + err);
        this.errorMessage.set('Impossible d\'extraire le texte de ce PDF.');
        this.loading.set(false);
      }
    });
  }
}
