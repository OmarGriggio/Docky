import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { ProjectAttachmentService } from '../project-attachment.service';
import { ProjectAttachment } from '../../../shared/models/project-attachment';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { formatFileSize } from '../../../shared/utils/display';

const ALLOWED_ATTACHMENT_TYPES = ['application/pdf'];

// Same dropzone interaction as company-profile's logo upload, but no image
// preview (a PDF has nothing worth previewing inline) - just the filename,
// plus the list of what's already attached below it.
@Component({
  selector: 'app-project-attachments',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, AppDatePipe],
  templateUrl: './project-attachments.html',
})
export class ProjectAttachments implements OnInit {

  projectId = input.required<number>();

  private service = inject(ProjectAttachmentService);

  attachments = signal<ProjectAttachment[]>([]);
  showArchived = signal(false);
  loading = signal(true);

  selectedFile = signal<File | null>(null);
  isDraggingOver = signal(false);
  uploading = signal(false);

  errorMessage = signal<string | null>(null);

  formatFileSize = formatFileSize;

  ngOnInit(): void {
    this.loadAttachments();
  }

  private loadAttachments(): void {
    this.loading.set(true);
    this.service.getAttachments(this.projectId(), this.showArchived()).subscribe({
      next: data => {
        this.attachments.set(data);
        this.loading.set(false);
      },
      error: err => {
        console.error('project-attachments : ' + err);
        this.errorMessage.set('Impossible de charger les pièces jointes.');
        this.loading.set(false);
      }
    });
  }

  onShowArchivedChange(value: boolean): void {
    this.showArchived.set(value);
    this.loadAttachments();
  }

  onDropzoneClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingOver.set(false);
    this.handleSelectedFile(event.dataTransfer?.files?.[0] ?? null);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handleSelectedFile(input.files?.[0] ?? null);
    // Reset so selecting the exact same file again still fires a change event.
    input.value = '';
  }

  private handleSelectedFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
      this.errorMessage.set('Seuls les fichiers PDF sont acceptés.');
      return;
    }

    this.errorMessage.set(null);
    this.selectedFile.set(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
  }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.uploading.set(true);
    this.errorMessage.set(null);

    this.service.uploadAttachment(this.projectId(), file).subscribe({
      next: () => {
        this.selectedFile.set(null);
        this.uploading.set(false);
        this.loadAttachments();
      },
      error: err => {
        console.error('project-attachments : ' + err);
        this.errorMessage.set('Impossible d\'ajouter la pièce jointe.');
        this.uploading.set(false);
      }
    });
  }

  downloadAttachment(attachment: ProjectAttachment): void {
    this.service.downloadAttachment(attachment.id).subscribe({
      next: blob => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: err => console.error('project-attachments : ' + err)
    });
  }

  archiveAttachment(attachment: ProjectAttachment): void {
    this.service.archiveAttachment(attachment.id).subscribe({
      next: () => this.loadAttachments(),
      error: err => console.error('project-attachments : ' + err)
    });
  }

  unarchiveAttachment(attachment: ProjectAttachment): void {
    this.service.unarchiveAttachment(attachment.id).subscribe({
      next: () => this.loadAttachments(),
      error: err => console.error('project-attachments : ' + err)
    });
  }

}
