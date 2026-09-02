import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { DocumentService } from '../document.service';
import { ClientService } from '../../clients/client.service';
import { ProjectService } from '../../projects/project.service';
import { Client } from '../../../shared/models/client';
import { Project } from '../../../shared/models/project';
import { DocumentStatus, DocumentType } from '../../../shared/models/document';

const TYPE_OPTIONS: { label: string; value: DocumentType }[] = [
  { label: 'Offre', value: 'QUOTE' },
  { label: 'Facture', value: 'INVOICE' },
];

const STATUS_OPTIONS: { label: string; value: DocumentStatus }[] = [
  { label: 'Brouillon', value: 'DRAFT' },
  { label: 'Envoyé', value: 'SENT' },
  { label: 'Accepté', value: 'ACCEPTED' },
  { label: 'Refusé', value: 'REJECTED' },
  { label: 'Payé', value: 'PAID' },
  { label: 'Annulé', value: 'CANCELLED' },
];

@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, Textarea, FloatLabel, Select, DatePicker, Button],
  templateUrl: './document-form.html',
})
export class DocumentForm implements OnInit {

  private fb = inject(FormBuilder);
  private documentService = inject(DocumentService);
  private clientService = inject(ClientService);
  private projectService = inject(ProjectService);

  saved = output<void>();
  cancelled = output<void>();

  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);
  errorMessage = signal<string | null>(null);

  typeOptions = TYPE_OPTIONS;
  statusOptions = STATUS_OPTIONS;

  clientOptions = computed(() =>
    this.clients().map(client => ({
      label: client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim(),
      value: client.id
    }))
  );

  projectOptions = computed(() =>
    this.projects().map(project => ({ label: project.name, value: project.id }))
  );

  form = this.fb.nonNullable.group({
    type: ['QUOTE' as DocumentType, Validators.required],
    number: ['', Validators.required],
    date: [new Date(), Validators.required],
    client_id: [null as number | null, Validators.required],
    project_id: [null as number | null],
    discount: [0],
    status: ['DRAFT' as DocumentStatus, Validators.required],
    introduction: [''],
    conclusion: [''],
  });

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-form : ' + err)
    });

    this.projectService.getProjects().subscribe({
      next: data => this.projects.set(data),
      error: err => console.error('document-form : ' + err)
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.errorMessage.set(null);

    const { client_id, date, ...rest } = this.form.getRawValue();

    this.documentService.createDocument({
      ...rest,
      client_id: client_id!,
      date: date.toISOString(),
      parent_document_id: null,
    }).subscribe({
      next: () => {
        this.saved.emit();
      },
      error: err => {
        console.error('document-form : ' + err);
        this.errorMessage.set('Impossible de créer le document. Le numéro est peut-être déjà utilisé.');
      }
    });
  }

}
