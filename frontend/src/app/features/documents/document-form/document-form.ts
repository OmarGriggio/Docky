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
import { ChantierService } from '../../chantiers/chantier.service';
import { Client } from '../../../shared/models/client';
import { Chantier } from '../../../shared/models/chantier';
import { DocumentStatut, DocumentType } from '../../../shared/models/document';

const TYPE_OPTIONS: { label: string; value: DocumentType }[] = [
  { label: 'Offre', value: 'OFFRE' },
  { label: 'Facture', value: 'FACTURE' },
];

const STATUT_OPTIONS: { label: string; value: DocumentStatut }[] = [
  { label: 'Brouillon', value: 'BROUILLON' },
  { label: 'Envoyé', value: 'ENVOYE' },
  { label: 'Accepté', value: 'ACCEPTE' },
  { label: 'Refusé', value: 'REFUSE' },
  { label: 'Payé', value: 'PAYE' },
  { label: 'Annulé', value: 'ANNULE' },
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
  private chantierService = inject(ChantierService);

  saved = output<void>();
  cancelled = output<void>();

  clients = signal<Client[]>([]);
  chantiers = signal<Chantier[]>([]);
  errorMessage = signal<string | null>(null);

  typeOptions = TYPE_OPTIONS;
  statutOptions = STATUT_OPTIONS;

  clientOptions = computed(() =>
    this.clients().map(client => ({
      label: client.societe || `${client.prenom ?? ''} ${client.nom ?? ''}`.trim(),
      value: client.id
    }))
  );

  chantierOptions = computed(() =>
    this.chantiers().map(chantier => ({ label: chantier.nom, value: chantier.id }))
  );

  form = this.fb.nonNullable.group({
    type: ['OFFRE' as DocumentType, Validators.required],
    numero: ['', Validators.required],
    date: [new Date(), Validators.required],
    id_client: [null as number | null, Validators.required],
    id_chantier: [null as number | null],
    rabais: [0],
    statut: ['BROUILLON' as DocumentStatut, Validators.required],
    introduction: [''],
    conclusion: [''],
  });

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-form : ' + err)
    });

    this.chantierService.getChantiers().subscribe({
      next: data => this.chantiers.set(data),
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

    const { id_client, date, ...rest } = this.form.getRawValue();

    this.documentService.createDocument({
      ...rest,
      id_client: id_client!,
      date: date.toISOString(),
      id_document_parent: null,
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
