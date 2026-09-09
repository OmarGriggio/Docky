import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { SelectButton } from 'primeng/selectbutton';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DocumentService } from '../document.service';
import { DocumentTemplateService } from '../document-template.service';
import { ClientService } from '../../clients/client.service';
import { ProjectService } from '../../projects/project.service';
import { CompanyService } from '../../profile/company.service';
import { AuthService } from '../../auth/auth.service';
import { Client } from '../../../shared/models/client';
import { Address } from '../../../shared/models/address';
import { Project } from '../../../shared/models/project';
import { Company } from '../../../shared/models/company';
import { DocumentType } from '../../../shared/models/document';
import { clientDisplayName } from '../../../shared/utils/display';

const TYPE_OPTIONS: { label: string; value: DocumentType }[] = [
  { label: 'Offre', value: 'QUOTE' },
  { label: 'Facture', value: 'INVOICE' },
];

// A full page rather than a small dialog - the whole point is to look like a
// simplified live preview of the document being created, not a plain list of
// fields. Body content (material/service/section/note lines) is deliberately
// not editable here yet - added afterwards from the document's own detail
// page (which is also where the server-generated number ends up shown).
//
// The project selector below is wired up (filtered to the selected client's
// projects) but doesn't pre-fill anything yet - there's no project->resources
// link in the schema to pre-fill FROM. See the "TODO: link projects to
// resources" bullet in CLAUDE.md for the planned shape of that.
@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, InputNumber, Textarea, FloatLabel, Select, SelectButton, DatePicker, Button, Card],
  templateUrl: './document-form.html',
  styleUrl: './document-form.css',
})
export class DocumentForm implements OnInit {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private documentService = inject(DocumentService);
  private documentTemplateService = inject(DocumentTemplateService);
  private clientService = inject(ClientService);
  private projectService = inject(ProjectService);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);

  company = signal<Company | null>(null);
  companyLogoUrl = computed(() => this.companyService.getLogoUrl(this.company()?.logo ?? null));

  clients = signal<Client[]>([]);
  projects = signal<Project[]>([]);
  selectedClientId = signal<number | null>(null);
  selectedClientAddress = signal<Address | null>(null);

  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  typeOptions = TYPE_OPTIONS;

  clientOptions = computed(() =>
    this.clients().map(client => ({
      label: clientDisplayName(client),
      value: client.id
    }))
  );

  // Only the selected client's own projects make sense to attach the
  // document to - filtered client-side since GET /project has no client_id
  // filter of its own.
  projectOptions = computed(() => {
    const clientId = this.selectedClientId();
    if (clientId === null) {
      return [];
    }
    return this.projects()
      .filter(project => project.client_id === clientId)
      .map(project => ({ label: project.name, value: project.id }));
  });

  form = this.fb.nonNullable.group({
    type: ['QUOTE' as DocumentType, Validators.required],
    date: [new Date(), Validators.required],
    client_id: [null as number | null, Validators.required],
    project_id: [null as number | null],
    discount: [0],
    vat_rate: [8.1],
    payment_terms: [''],
    due_date: [null as Date | null],
    introduction: [''],
    conclusion: [''],
  });

  constructor() {
    this.form.controls.client_id.valueChanges.subscribe(clientId => {
      this.selectedClientId.set(clientId);
      // A project picked for a previous client no longer makes sense.
      this.form.patchValue({ project_id: null });
      this.loadClientAddress(clientId);
    });

    this.form.controls.type.valueChanges.subscribe(type => this.loadTemplate(type));
  }

  ngOnInit(): void {
    // valueChanges above only fires on a *change* - load the default type's
    // template too, since nothing has actually changed yet at this point.
    this.loadTemplate(this.form.controls.type.value);

    this.clientService.getClients().subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-form : ' + err)
    });

    this.projectService.getProjects().subscribe({
      next: data => this.projects.set(data),
      error: err => console.error('document-form : ' + err)
    });

    const companyId = this.authService.currentUser()?.company_id;
    if (companyId) {
      this.companyService.getCompany(companyId).subscribe({
        next: company => this.company.set(company),
        error: err => console.error('document-form : ' + err)
      });
    }
  }

  // Only meant for a fresh document, where introduction/conclusion are still
  // empty either way - so this always applies the template outright, no
  // "only if empty" check needed.
  private loadTemplate(type: DocumentType): void {
    this.documentTemplateService.getTemplate(type).subscribe({
      next: template => {
        this.form.patchValue({
          introduction: template?.introduction ?? '',
          conclusion: template?.conclusion ?? '',
        });
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  private loadClientAddress(clientId: number | null): void {
    if (clientId === null) {
      this.selectedClientAddress.set(null);
      return;
    }

    this.clientService.getClient(clientId).subscribe({
      next: client => {
        const address = client.addresses.find(a => a.is_primary) ?? client.addresses[0] ?? null;
        this.selectedClientAddress.set(address);
      },
      error: err => {
        console.error('document-form : ' + err);
        this.selectedClientAddress.set(null);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/documents']);
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    const { client_id, date, due_date, ...rest } = this.form.getRawValue();

    this.documentService.createDocument({
      ...rest,
      client_id: client_id!,
      date: date.toISOString(),
      due_date: due_date ? due_date.toISOString() : null,
      parent_document_id: null,
      // Every document starts as a draft - status changes happen afterwards,
      // not at creation.
      status: 'DRAFT',
    }).subscribe({
      next: created => {
        // The server-generated number (document.service.ts's
        // generateDocumentNumber) is shown on the document's own detail
        // page, which is also where lines get added next.
        this.router.navigate(['/documents', created.id]);
      },
      error: err => {
        console.error('document-form : ' + err);
        this.submitting.set(false);
        this.errorMessage.set('Impossible de créer le document. Réessaie dans un instant.');
      }
    });
  }

}
