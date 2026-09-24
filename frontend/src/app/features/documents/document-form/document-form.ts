import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Dialog } from 'primeng/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ClientForm } from '../../clients/client-form/client-form';
import { ResourceForm } from '../../resources/resource-form/resource-form';
import { DocumentService } from '../document.service';
import { DocumentSectionService } from '../document-section.service';
import { DocumentLineService } from '../document-line.service';
import { DocumentCompleteService } from '../document-complete.service';
import { DocumentTemplateService } from '../document-template.service';
import { ClientService } from '../../clients/client.service';
import { ProjectService } from '../../projects/project.service';
import { ResourceService } from '../../resources/resource.service';
import { ResourceUnitService } from '../../resources/resource-unit.service';
import { CompanyService } from '../../profile/company.service';
import { AuthService } from '../../auth/auth.service';
import { Client } from '../../../shared/models/client';
import { Address } from '../../../shared/models/address';
import { Project } from '../../../shared/models/project';
import { Resource } from '../../../shared/models/resource';
import { ResourceUnit } from '../../../shared/models/resource-unit';
import { Company } from '../../../shared/models/company';
import { DocumentStatus, DocumentType } from '../../../shared/models/document';
import { DocumentComplete } from '../../../shared/models/document-complete';
import { clientDisplayName, addressLabel, addDays, fromDateOnly, toDateOnly, fillPlaceholders, formatLongDate, DEFAULT_CLIENT_TITLE } from '../../../shared/utils/display';
import { TabIndentDirective } from '../../../shared/directives/tab-indent.directive';

// PROJECT never actually reaches this page (a chantier is never created or
// edited here - see zz_docs/Project Definition.md) but DocumentType still
// includes it, so the Record needs an entry regardless.
const TYPE_LABELS: Record<DocumentType, string> = {
  QUOTE: 'offre',
  INVOICE: 'facture',
  PROJECT: 'chantier',
};

// Matches document.service.ts's own EDITABLE_STATUSES on the backend -
// duplicated here purely so the form can hide/disable itself instead of
// letting the user fill it out only to hit a 409 on save.
const EDITABLE_STATUSES: DocumentStatus[] = ['DRAFT', 'SENT'];

// Matches shared/models/document-line.ts's DocumentLine - both types share
// quantity+unit for their amount (e.g. "20 Sac" for a material, "5 Heure"
// for a service), no separate time field. No `reference` either -
// document_lines has no such column.
type DraftLineType = 'MATERIAL' | 'SERVICE';

interface DraftLine {
  id: number;
  type: DraftLineType;
  label: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number;
  discount: number;        // %
  // Which catalog resource this line came from, if any (null for a
  // hand-typed line) - sent to the backend (document_lines.resource_id), so
  // an accepted quote can turn it into a project_resources row (see
  // document.service.ts's acceptQuoteServ). Also used locally to keep an
  // already-used resource out of the "add a resource" picker below (see
  // availableCatalogResourceOptions).
  resource_id: number | null;
}

interface DraftSection {
  id: number;
  title: string;
  description: string;
  lines: DraftLine[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

let nextId = 1;

// A full page rather than a small dialog - the whole point is to look like a
// simplified live preview of the document being built. Sections/lines are
// built up as pure local state while editing, but "Valider"/"Enregistrer"
// actually persists everything server-side: POST/PUT /document, then POST
// /document-section per section, then POST /document-line per line under it
// (sequentially - each line needs its real section_id, which only exists
// once that section's own create resolves).
//
// Three entry points share this one page (no more separate detail/edit
// pages - see zz_docs/Project Definition.md's lifecycle):
//  - documents/new[?type=...]                    - blank draft.
//  - documents/new?type=QUOTE&duplicateFrom=<id>  - pre-filled copy of an
//                                                    existing quote, saved as
//                                                    a brand new one.
//  - documents/:id                                - editing that exact
//                                                    document in place
//                                                    (see loadForEdit).
@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [FormsModule, PricePipe, InputText, InputNumber, Textarea, FloatLabel, Select, DatePicker, Button, Card, Dialog, ConfirmDialogComponent, ClientForm, ResourceForm, TabIndentDirective],
  templateUrl: './document-form.html',
  styleUrl: './document-form.css',
})
export class DocumentForm implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);
  private documentSectionService = inject(DocumentSectionService);
  private documentLineService = inject(DocumentLineService);
  private documentCompleteService = inject(DocumentCompleteService);
  private documentTemplateService = inject(DocumentTemplateService);
  private clientService = inject(ClientService);
  private projectService = inject(ProjectService);
  private resourceService = inject(ResourceService);
  private resourceUnitService = inject(ResourceUnitService);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);

  company = signal<Company | null>(null);
  companyLogoUrl = computed(() => this.companyService.getFileUrl(this.company()?.logo ?? null));

  clients = signal<Client[]>([]);
  clientOptions = computed(() =>
    this.clients().map(client => ({ label: clientDisplayName(client), value: client.id }))
  );

  // "Ajouter un client" (the client p-select's own footer, see the
  // template) - for when the client being invoiced/quoted doesn't exist
  // yet. The newly created client is added to the list and selected right
  // away, same as picking an existing one by hand.
  createClientDialogVisible = signal(false);

  onClientCreated(client: Client): void {
    this.clients.update(clients => [...clients, client]);
    this.createClientDialogVisible.set(false);
    this.onClientChange(client.id);
  }

  projects = signal<Project[]>([]);

  selectedClientId = signal<number | null>(null);
  // The selected client's own saved addresses - source for both addresses
  // below: where the document itself is billed to/sent (always the
  // client's own primary one, read-only - see selectedClientAddress) is a
  // different thing from "Lieu/Bâtiment" (addressId/addressOptions), the
  // work site a chantier's own resource ledger belongs to, freely pickable
  // among the same list.
  private clientAddresses = signal<Address[]>([]);
  // Billing address - read-only, purely informational (where this
  // document itself is sent), unrelated to addressId below.
  selectedClientAddress = computed(() =>
    this.clientAddresses().find(a => a.is_primary) ?? this.clientAddresses()[0] ?? null
  );
  addressOptions = computed(() =>
    this.clientAddresses().map(address => ({ label: addressLabel(address), value: address.id }))
  );
  // The selected client's own civility ("Monsieur"/"Madame") - what
  // {{titre_client}} stands for in the read-only introduction/conclusion
  // preview (see resolvePlaceholders). Derived from the already-loaded
  // `clients` list rather than a separate fetch - it's the same data
  // selectedClientAddress reads through clientAddresses, just a different
  // field of the same client.
  selectedClientTitle = computed(() => {
    const clientId = this.selectedClientId();
    return this.clients().find(client => client.id === clientId)?.title ?? null;
  });

  // Shown under the introduction/conclusion textareas - built here since a
  // literal double brace in a template is read as an interpolation.
  placeholdersHint = 'Variables : {{titre_client}}, {{date}}, {{montant}}, {{signature_entreprise}}';

  // The introduction/conclusion as the PDF will print it (see the backend's
  // pdf/templates/document.placeholders.ts): {{titre_client}} (Madame,
  // Monsieur if the client has none), {{date}} (the document's), {{montant}}
  // (Total TTC) and {{signature_entreprise}} (the company's name). A method, not a computed: `date` is a plain
  // property, which a computed() would never re-read once cached.
  resolvePlaceholders(text: string): string {
    return fillPlaceholders(text, {
      titre_client: this.selectedClientTitle()?.trim() || DEFAULT_CLIENT_TITLE,
      date: formatLongDate(this.date),
      montant: `${this.documentTotalInclVat().toFixed(2)} CHF`,
      signature_entreprise: this.company()?.name ?? '',
    });
  }
  // No manual "Chantier" picker in the UI (an invoice is always linked to
  // its chantier the other way around - project-list.ts's own "Facturer",
  // see applyFromProject) - selectedProjectId/selectedProjectDocumentId
  // exist purely for that, never surfaced or picked here.
  private selectedProjectId: number | null = null;
  // A chantier is no longer a flat "resource + quantity" list
  // (project_resources is gone) - it's a real PROJECT-type document, whose
  // own document_sections/document_lines ARE its resource ledger. This is
  // that document's id, resolved from the picked Project's own document_id
  // (see onProjectChange) - what loadProjectResources below and submit()'s
  // own parent_document_id actually read from.
  private selectedProjectDocumentId: number | null = null;

  // The company's full resource catalog - source for the "Ajouter depuis le
  // catalogue"/"Ajouter une ressource" picker (see zz_docs/Decisions.md: a
  // QUOTE has no project to pull from yet, it's how the need gets defined in
  // the first place; an INVOICE could offer the project's own resource
  // ledger instead, but picking from the full catalog the same way keeps
  // both types consistent and doesn't block a correction that ledger
  // didn't anticipate).
  resources = signal<Resource[]>([]);

  // The company's own customizable unit list (see zz_migrations/
  // 006_create_resource_units.sql) - source for the "unit" picker on every
  // line below (unitOptions/addUnit). Loaded once in ngOnInit like
  // resources above.
  private resourceUnits = signal<ResourceUnit[]>([]);
  // Ids of sections that came from "Charger chantier" (applyFromProject's
  // own loadProjectResources call, see "Facturer" above) - tracked so
  // re-running it (or clearing the project) replaces exactly these, never a
  // section the user built by hand.
  private importedSectionIds = new Set<number>();

  // A resource already used as a line anywhere in the document (however it
  // got there - catalog picker or bulk import) no longer makes sense to
  // offer again.
  private usedResourceIds = computed(() =>
    new Set(
      this.sections()
        .flatMap(section => section.lines)
        .map(line => line.resource_id)
        .filter((id): id is number => id !== null)
    )
  );

  availableCatalogResourceOptions = computed(() =>
    this.resources()
      .filter(resource => !this.usedResourceIds().has(resource.id))
      .map(resource => ({ label: resource.name, value: resource.id }))
  );

  // Decided by which list (Offres/Factures) "Ajouter" was clicked from - see
  // document-list.ts's createDocument() - not editable here. Defaults to
  // QUOTE if this page is ever reached without a type param. Set once in
  // ngOnInit and never changes afterwards, so a plain getter (not a signal)
  // is enough for the template to read it.
  type: DocumentType = 'QUOTE';
  get typeLabel(): string {
    return TYPE_LABELS[this.type];
  }

  // Set by loadForEdit() when this page is reached as documents/:id - null
  // means a fresh/duplicated draft (documents/new), submit() branches on it.
  editingDocumentId = signal<number | null>(null);
  // Only meaningful in edit mode - a fresh draft always says "généré
  // automatiquement" instead (see the template).
  documentNumber = signal<string | null>(null);
  // A document past DRAFT/SENT is a frozen record (see
  // zz_docs/Project Definition.md's lifecycle) - the backend rejects the PUT
  // regardless, this just avoids letting the user fill out a form that can
  // never actually save.
  locked = signal(false);

  get pageTitle(): string {
    if (this.editingDocumentId() !== null) {
      return this.type === 'QUOTE' ? "Modifier l'offre" : 'Modifier la facture';
    }
    return `Nouvelle ${this.typeLabel}`;
  }

  date = new Date();

  // Pre-filled from the type's template (due_days, see loadTemplate) and
  // recomputed from `date` while the user hasn't picked one by hand - once
  // they have (or it came from a saved document), it stays as they set it.
  // A signal: it's set from an HTTP callback (zoneless, see introduction).
  dueDate = signal<Date | null>(null);
  private dueDays: number | null = null;
  private dueDateTouched = false;

  onDateChange(value: Date | null): void {
    if (value) {
      this.date = value;
      this.applyDefaultDueDate();
    }
  }

  onDueDateChange(value: Date | null): void {
    this.dueDate.set(value);
    this.dueDateTouched = true;
  }

  private applyDefaultDueDate(): void {
    if (this.dueDays !== null && !this.dueDateTouched) {
      this.dueDate.set(addDays(this.date, this.dueDays));
    }
  }

  private dueDateForApi(): string | null {
    const due = this.dueDate();
    return due ? toDateOnly(due) : null;
  }
  // "Lieu/Bâtiment" picker (see addressOptions below) - defaults to the
  // selected client's own primary address (onClientChange), or the
  // chantier's own one when coming from "Facturer" (applyFromProject passes
  // its own preferredAddressId), always still changeable by hand afterwards.
  // Preserved as-is (not reset) when editing an existing document (see
  // loadForEdit).
  addressId: number | null = null;
  // The client's own reference/PO number - INVOICE only (see the template),
  // a QUOTE has no field for it. Bound directly via ngModel like the other
  // plain text fields below (paymentTerms etc.), so it has to be public.
  referenceClient = '';
  // Signals, not plain properties - this app is zoneless (no zone.js, see
  // package.json), so a plain property mutated from an HTTP subscribe
  // callback (loadTemplate/loadForEdit/etc. below) never schedules a
  // change-detection tick on its own; the template stayed stale until some
  // unrelated Angular-bound event (any click) happened to trigger one.
  // Same underlying issue as discount/vatRate above, just surfacing as "the
  // default text doesn't show up until I click something" instead of "the
  // total doesn't update".
  introduction = signal('');
  conclusion = signal('');
  paymentTerms = '';
  // Signals, not plain properties like the fields above - documentTotalAfterDiscount/
  // documentTotalInclVat below are computed() from these, which only
  // re-evaluates on a tracked *signal* read; a plain property mutated by
  // ngModel wouldn't invalidate that cache, so the total would only catch up
  // whenever something else happened to force a recompute (e.g. on save).
  discount = signal(0);
  // Defaults to the company's own rate once it loads (see ngOnInit) - a
  // fallback here only matters if that fetch fails outright.
  vatRate = signal(8.1);

  sections = signal<DraftSection[]>([]);

  lineTypeOptions: { label: string; value: DraftLineType }[] = [
    { label: 'Matériel', value: 'MATERIAL' },
    { label: 'Service', value: 'SERVICE' },
  ];

  // One pending "new line" draft per section, keyed by section id, so each
  // section's little inline add-row keeps its own in-progress values.
  private newLineDrafts = new Map<number, DraftLine>();

  errorMessage = signal<string | null>(null);
  submitting = signal(false);

  // Introduction/conclusion: a 2-line read-only preview + "Modifier" by
  // default (see document-form.html) - clicking it swaps to an editable
  // textarea, pre-filled with the *current* value (introductionDraft/
  // conclusionDraft), independent of `introduction`/`conclusion` above
  // until actually saved. "Sauvegarder" doesn't just apply the draft to
  // this document - see the confirm dialog below, it also overwrites the
  // company's own default template for every future document of this type
  // (saveAsDefaultTemplate below sends the whole introduction+conclusion
  // pair together, same as before - not a per-field patch). Cancelling
  // (or never clicking Sauvegarder at all) discards the draft - nothing is
  // applied to this document either.
  editingIntroduction = signal(false);
  introductionDraft = signal('');
  editingConclusion = signal(false);
  conclusionDraft = signal('');

  savingTemplate = signal(false);
  templateSaveError = signal<string | null>(null);

  templateConfirmVisible = signal(false);
  templateConfirmMessage = signal('');
  private pendingTemplateField: 'introduction' | 'conclusion' | null = null;

  documentSubtotal = computed(() =>
    round2(this.sections().reduce((sum, section) => sum + this.sectionTotal(section), 0))
  );

  documentTotalAfterDiscount = computed(() =>
    round2(this.documentSubtotal() * (1 - this.discount() / 100))
  );

  documentTotalInclVat = computed(() =>
    round2(this.documentTotalAfterDiscount() * (1 + this.vatRate() / 100))
  );

  async ngOnInit(): Promise<void> {
    this.clientService.getClients().subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-form : ' + err)
    });

    this.resourceService.getResources().subscribe({
      next: data => this.resources.set(data),
      error: err => console.error('document-form : ' + err)
    });

    this.resourceUnitService.getUnits().subscribe({
      next: data => this.resourceUnits.set(data),
      error: err => console.error('document-form : ' + err)
    });

    // Awaited (not a plain subscribe) so it resolves before the
    // create-vs-edit-vs-duplicate branch below: vatRate/paymentTerms' own
    // defaults here are only ever the *fresh-document* case (a real edit/
    // duplicate overwrites them afterwards with the source document's own
    // values, see loadForEdit/applyDuplicateFrom) - a parallel fetch could
    // otherwise lose that race and leave the fresh default in place instead.
    const companyId = this.authService.currentUser()?.company_id;
    if (companyId) {
      try {
        const company = await firstValueFrom(this.companyService.getCompany(companyId));
        this.company.set(company);
        this.vatRate.set(company.vat_rate);
        this.paymentTerms = company.payment_terms ?? '';
      } catch (err) {
        console.error('document-form : ' + err);
      }
    }

    // Loaded before deciding create-vs-edit below (not in parallel with it):
    // editing an INVOICE needs to resolve its parent_document_id back to
    // which Project that is (see loadForEdit), which needs this list
    // already populated - a plain parallel fetch would race it.
    this.projectService.getProjects().subscribe({
      next: data => {
        this.projects.set(data);

        // documents/:id (edit) and documents/new (create/duplicate) are two
        // different route configs pointing at this same component, so a
        // snapshot read is enough here - Angular doesn't reuse the instance
        // across them, unlike the ?type= switch below on the create route.
        const idParam = this.route.snapshot.paramMap.get('id');

        if (idParam) {
          this.loadForEdit(Number(idParam));
        } else {
          // A queryParamMap subscription, not a one-time snapshot read:
          // this route (documents/new) stays the same whether it's reached
          // with ?type=QUOTE or ?type=INVOICE, so Angular reuses the same
          // component instance across navigations between them - a
          // snapshot taken once here would go stale the second time this
          // page is visited without a full reload.
          this.route.queryParamMap.subscribe(params => {
            const typeParam = params.get('type') as DocumentType | null;
            this.type = (typeParam === 'QUOTE' || typeParam === 'INVOICE') ? typeParam : 'QUOTE';

            // "Dupliquer" (document-list.ts) - pre-fills this page from an
            // existing quote's own data instead of the type's default
            // template (the two would otherwise race, and the duplicate's
            // own introduction/conclusion should win regardless of which
            // resolves first).
            const duplicateFromParam = params.get('duplicateFrom');
            // "Facturer" (project-list.ts, a COMPLETED chantier only) -
            // unlike "Dupliquer", this one still wants the type's own
            // default introduction/conclusion (a chantier has none of its
            // own) - only the client/project/resource-ledger prefill below
            // is skipped for the type's default handling.
            const fromProjectParam = params.get('fromProject');
            if (duplicateFromParam) {
              this.applyDuplicateFrom(Number(duplicateFromParam));
            } else {
              this.loadTemplate(this.type);
              if (fromProjectParam) {
                this.applyFromProject(Number(fromProjectParam));
              }
            }
          });
        }
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // Fills introduction/conclusion from this type's saved template, if any -
  // fine to always apply outright since a fresh document starts with both
  // empty either way, no "only if already blank" check needed. Called from
  // the queryParamMap subscription above, both on first load and on a
  // reused-component navigation to the other type.
  private loadTemplate(type: DocumentType, applyText = true): void {
    this.documentTemplateService.getTemplate(type).subscribe({
      next: template => {
        if (applyText) {
          this.introduction.set(template?.introduction ?? '');
          this.conclusion.set(template?.conclusion ?? '');
        }
        this.dueDays = template?.due_days ?? null;
        this.applyDefaultDueDate();
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // "Facturer" (project-list.ts) - picks this chantier's own client and
  // project (exactly as if the user had picked them by hand, see
  // onClientChange/onProjectChange below) then runs the same "Charger
  // chantier" import loadProjectResources() does, so invoicing a completed
  // chantier is a review-and-submit instead of rebuilding it from scratch.
  private applyFromProject(projectId: number): void {
    const project = this.projects().find(p => p.id === projectId);
    if (!project) {
      return;
    }

    // The chantier's own address (see project.service.ts's acceptQuoteServ -
    // it lives on the chantier's own backing document, not duplicated on
    // the Project row) - fetched first so it's ready to pass as
    // onClientChange's own preferredAddressId, rather than set separately
    // afterwards and risk losing a race against that method's own default.
    this.documentService.getDocument(project.document_id).subscribe({
      next: chantierDocument => {
        this.onClientChange(project.client_id, chantierDocument.address_id);
        this.onProjectChange(project.id);
        this.loadProjectResources();
      },
      error: err => {
        console.error('document-form : ' + err);
        this.onClientChange(project.client_id);
        this.onProjectChange(project.id);
        this.loadProjectResources();
      }
    });
  }

  // "Dupliquer" (document-list.ts) - copies a source quote's client,
  // intro/conclusion/payment terms/discount/VAT and its full sections+lines
  // into this page's local draft state, as a starting point for a new one.
  // Nothing is created server-side here - it's exactly as if the user had
  // built all of this by hand, still fully editable, and `submit()` below
  // creates it from scratch on save (a fresh number, DRAFT status, no link
  // back to the source document).
  private applyDuplicateFrom(sourceId: number): void {
    // Only for the due date default - the duplicate keeps its source's own
    // introduction/conclusion, and the source's due date would be stale.
    this.loadTemplate(this.type, false);

    this.documentCompleteService.getDocumentComplete(sourceId).subscribe({
      next: source => {
        this.onClientChange(source.client_id, source.address_id);

        this.introduction.set(source.introduction ?? '');
        this.conclusion.set(source.conclusion ?? '');
        this.paymentTerms = source.payment_terms ?? '';
        this.discount.set(source.discount);
        this.vatRate.set(source.vat_rate);

        this.sections.set(this.buildDraftSections(source));
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // "Modifier" (document-list.ts) - loads an existing document's own data
  // in place of a blank draft. Unlike "Dupliquer", the type/date/number are
  // the source document's real ones (not reset), and submit() below updates
  // this exact document instead of creating a new one.
  private loadForEdit(id: number): void {
    this.editingDocumentId.set(id);

    this.documentCompleteService.getDocumentComplete(id).subscribe({
      next: source => {
        this.type = source.type;
        this.documentNumber.set(source.number);
        // A PROJECT document's own status is always null (see
        // shared/models/document.ts) - never editable through this page
        // either way, though nothing currently routes one here.
        this.locked.set(source.status === null || !EDITABLE_STATUSES.includes(source.status));
        this.date = new Date(source.date);
        this.dueDate.set(source.due_date ? fromDateOnly(source.due_date) : null);
        this.dueDateTouched = true;
        this.referenceClient = source.reference_client ?? '';

        this.onClientChange(source.client_id, source.address_id);

        this.introduction.set(source.introduction ?? '');
        this.conclusion.set(source.conclusion ?? '');
        this.paymentTerms = source.payment_terms ?? '';
        this.discount.set(source.discount);
        this.vatRate.set(source.vat_rate);

        // Populates the "ressource du chantier" picker/"Charger chantier"
        // with the already-linked project's data - editing never changes
        // which project an invoice is on (see UpdateDocumentData on the
        // backend), this is purely so more lines can still be added from
        // it. parent_document_id is the chantier's own PROJECT document -
        // resolved back to which Project that is via its document_id
        // (this.projects() is already loaded by the time this runs, see
        // ngOnInit).
        if (this.type === 'INVOICE' && source.parent_document_id !== null) {
          const project = this.projects().find(p => p.document_id === source.parent_document_id);
          if (project) {
            this.onProjectChange(project.id);
          }
        }

        this.sections.set(this.buildDraftSections(source));
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // Shared by applyDuplicateFrom and loadForEdit - rebuilds the page's local
  // draft sections/lines from a DocumentComplete's own, with fresh local ids
  // (see the `id`/`nextId` comment on DraftSection/DraftLine - these are
  // never sent to the backend, purely for tracking within this page).
  private buildDraftSections(source: DocumentComplete): DraftSection[] {
    return [...source.sections]
      .sort((a, b) => a.position - b.position)
      .map(section => ({
        id: nextId++,
        title: section.title,
        description: section.description ?? '',
        lines: source.lines
          .filter(line => line.section_id === section.id)
          .sort((a, b) => a.position - b.position)
          .map(line => ({
            id: nextId++,
            type: line.type,
            label: line.label,
            quantity: line.quantity,
            unit: line.unit,
            unit_price: line.unit_price,
            discount: line.discount,
            resource_id: line.resource_id,
          })),
      }));
  }

  startEditIntroduction(): void {
    this.introductionDraft.set(this.introduction());
    this.editingIntroduction.set(true);
  }

  cancelEditIntroduction(): void {
    this.editingIntroduction.set(false);
  }

  // "Appliquer" - unlike confirmSaveIntroduction below, only affects this
  // document (no API call, no confirmation): the draft becomes this
  // document's own introduction and the field goes back to read-only,
  // nothing is promoted to the company's own default template.
  applyIntroduction(): void {
    this.introduction.set(this.introductionDraft());
    this.editingIntroduction.set(false);
  }

  confirmSaveIntroduction(): void {
    this.openTemplateConfirm('introduction');
  }

  startEditConclusion(): void {
    this.conclusionDraft.set(this.conclusion());
    this.editingConclusion.set(true);
  }

  cancelEditConclusion(): void {
    this.editingConclusion.set(false);
  }

  applyConclusion(): void {
    this.conclusion.set(this.conclusionDraft());
    this.editingConclusion.set(false);
  }

  confirmSaveConclusion(): void {
    this.openTemplateConfirm('conclusion');
  }

  private openTemplateConfirm(field: 'introduction' | 'conclusion'): void {
    this.pendingTemplateField = field;
    const noun = this.type === 'INVOICE' ? 'factures' : 'offres';
    this.templateConfirmMessage.set(
      `Ce texte deviendra le nouveau texte par défaut pour toutes les prochaines ${noun}. Continuer ?`
    );
    this.templateConfirmVisible.set(true);
  }

  // Promotes the edited field's draft to be the new saved default for this
  // document's type (QUOTE/INVOICE) - same PUT the Profile page's "Modèles
  // de documents" card uses. Both this document's own field and the
  // company-wide default are only actually updated once this resolves -
  // confirming the dialog is what commits both together, never before.
  onTemplateConfirmed(): void {
    const field = this.pendingTemplateField;
    this.pendingTemplateField = null;
    if (!field) {
      return;
    }

    const introduction = field === 'introduction' ? this.introductionDraft() : this.introduction();
    const conclusion = field === 'conclusion' ? this.conclusionDraft() : this.conclusion();

    this.savingTemplate.set(true);
    this.templateSaveError.set(null);

    this.documentTemplateService.upsertTemplate(this.type, { introduction, conclusion }).subscribe({
      next: () => {
        this.introduction.set(introduction);
        this.conclusion.set(conclusion);
        this.savingTemplate.set(false);
        this.editingIntroduction.set(false);
        this.editingConclusion.set(false);
      },
      error: err => {
        console.error('document-form : ' + err);
        this.savingTemplate.set(false);
        this.templateSaveError.set('Impossible d\'enregistrer le modèle par défaut.');
      }
    });
  }

  // "Ajouter une adresse" (the "Lieu/Bâtiment" picker's own footer) - this
  // page has no address form of its own, client-detail.ts already does
  // (its own addresses table). Navigating away loses whatever draft is
  // filled in here, same trade-off as "Annuler" - acceptable since adding
  // a missing address is expected to be rare, not a normal step.
  goToClientAddresses(): void {
    const clientId = this.selectedClientId();
    if (clientId === null) {
      return;
    }
    this.router.navigate(['/clients', clientId]);
  }

  // preferredAddressId: no automatic fallback (e.g. the client's own
  // primary address) - a QUOTE always starts at null, an INVOICE only ever
  // defaults to the chantier's own address, and both stay freely clearable
  // by hand afterwards (see the template's [showClear]). "Facturer"
  // (applyFromProject below) already knows which address it wants before
  // this client's addresses have even loaded - passed through here instead
  // of set separately afterwards, since setting it after would race this
  // method's own async call (whichever HTTP call resolved last would win).
  onClientChange(clientId: number | null, preferredAddressId: number | null = null): void {
    this.selectedClientId.set(clientId);
    // A project picked for a previous client no longer makes sense - and
    // neither does whatever it had imported (onProjectChange(null) already
    // clears both).
    this.onProjectChange(null);
    this.addressId = preferredAddressId;

    if (clientId === null) {
      this.clientAddresses.set([]);
      return;
    }

    this.clientService.getClient(clientId).subscribe({
      next: client => this.clientAddresses.set(client.addresses),
      error: err => {
        console.error('document-form : ' + err);
        this.clientAddresses.set([]);
      }
    });
  }

  // Picking a project doesn't prefill any section/line by itself - only
  // invalidates whatever the previous project had bulk-imported (if any),
  // since it no longer applies (see clearImportedSections). Called by
  // onClientChange(null) to reset both, and by applyFromProject ("Facturer"
  // - see below) to set them from a specific chantier; there's no UI
  // control that calls this directly anymore.
  private onProjectChange(projectId: number | null): void {
    this.selectedProjectId = projectId;
    this.clearImportedSections();

    const project = this.projects().find(p => p.id === projectId);
    this.selectedProjectDocumentId = project?.document_id ?? null;
  }

  // "Charger chantier" - copies the selected project's own PROJECT document
  // sections+lines wholesale into this document's draft (same
  // buildDraftSections used for "Dupliquer" an offer - a chantier's resource
  // ledger IS a document now, not a flat list, so there's no "Matériel"/
  // "Service" regrouping to do anymore, its own section titles are kept
  // as-is). Skips any line whose resource is already used elsewhere in this
  // document, and drops a section left with nothing to import. Replaces
  // whatever a previous load had imported - never touches a section the
  // user added by hand.
  loadProjectResources(): void {
    if (this.selectedProjectDocumentId === null) {
      return;
    }

    this.clearImportedSections();

    this.documentCompleteService.getDocumentComplete(this.selectedProjectDocumentId).subscribe({
      next: source => {
        const usedIds = this.usedResourceIds();
        const importedSections = this.buildDraftSections(source)
          .map(section => ({
            ...section,
            lines: section.lines.filter(line => line.resource_id === null || !usedIds.has(line.resource_id)),
          }))
          .filter(section => section.lines.length > 0);

        for (const section of importedSections) {
          this.importedSectionIds.add(section.id);
        }
        this.sections.update(sections => [...sections, ...importedSections]);
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // Adds a single resource from the company's full catalog as a new line at
  // the end of the given section - the per-section catalog picker, used by
  // both types now ("Ajouter depuis le catalogue"/"Ajouter une ressource",
  // see document-form.html).
  addCatalogResourceLine(sectionId: number, resourceId: number | null): void {
    if (resourceId === null) {
      return;
    }

    const resource = this.resources().find(r => r.id === resourceId);
    if (!resource) {
      return;
    }

    const line = this.lineFromResource(resource, 1, resource.selling_price);
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, lines: [...s.lines, line] } : s)
    );
  }

  // "Ajouter une ressource" (the catalog p-select's own footer, see the
  // template) - for when the resource being added doesn't exist in the
  // catalog yet. Remembers which section's picker it was opened from, so
  // the newly created resource lands there as a line right away, same as
  // picking an existing one by hand.
  createResourceDialogVisible = signal(false);
  private createResourceSectionId: number | null = null;

  openCreateResourceDialog(sectionId: number): void {
    this.createResourceSectionId = sectionId;
    this.createResourceDialogVisible.set(true);
  }

  onResourceCreated(resource: Resource): void {
    this.resources.update(resources => [...resources, resource]);
    this.createResourceDialogVisible.set(false);
    if (this.createResourceSectionId !== null) {
      this.addCatalogResourceLine(this.createResourceSectionId, resource.id);
    }
  }

  private clearImportedSections(): void {
    if (this.importedSectionIds.size === 0) {
      return;
    }
    this.sections.update(sections => sections.filter(s => !this.importedSectionIds.has(s.id)));
    this.importedSectionIds.clear();
  }

  private lineFromResource(resource: Resource, quantity: number, unit_price: number): DraftLine {
    return {
      id: nextId++,
      type: resource.type,
      label: resource.name,
      quantity,
      unit: resource.unit,
      unit_price,
      discount: 0,
      resource_id: resource.id,
    };
  }

  addSection(): void {
    this.sections.update(sections => [
      ...sections,
      { id: nextId++, title: '', description: '', lines: [] }
    ]);
  }

  removeSection(sectionId: number): void {
    this.newLineDrafts.delete(sectionId);
    this.sections.update(sections => sections.filter(s => s.id !== sectionId));
  }

  updateSectionTitle(sectionId: number, title: string): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, title } : s)
    );
  }

  updateSectionDescription(sectionId: number, description: string): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, description } : s)
    );
  }

  // Lazily creates an empty draft line the first time a section's add-row is
  // rendered, so ngModel has something to bind to.
  newLineFor(sectionId: number): DraftLine {
    let draft = this.newLineDrafts.get(sectionId);
    if (!draft) {
      draft = this.emptyLine();
      this.newLineDrafts.set(sectionId, draft);
    }
    return draft;
  }

  private emptyLine(): DraftLine {
    return {
      id: 0,
      type: 'MATERIAL',
      label: '',
      quantity: null,
      unit: null,
      unit_price: 0,
      discount: 0,
      resource_id: null,
    };
  }

  addLine(sectionId: number): void {
    const draft = this.newLineFor(sectionId);
    if (!draft.label.trim()) {
      return;
    }

    const line: DraftLine = { ...draft, id: nextId++ };

    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, lines: [...s.lines, line] } : s)
    );

    this.newLineDrafts.set(sectionId, this.emptyLine());
  }

  // Plain method (not a computed signal) since it also has to reflect
  // newLineDrafts's own mutable Map, which isn't itself reactive - same
  // reasoning as newLineFor above, re-run on every change-detection pass
  // instead. Options are every label the company already has, plus
  // whatever's currently sitting in a line/draft's own unit (covers a
  // pre-existing free-text value that predates this picker, so it still
  // shows as selected instead of going blank). Adding a new one is the
  // select's own footer (see addUnit).
  // unitId is the resource_units row an option comes from - null for the
  // ones with none (a label only present because a line/draft uses it), the
  // ones that don't get the remove cross in the template (see archiveUnit).
  unitOptions(): { label: string; value: string; unitId: number | null }[] {
    const labels = new Set<string>();
    const unitIds = new Map<string, number>();
    for (const unit of this.resourceUnits()) {
      labels.add(unit.label);
      unitIds.set(unit.label, unit.id);
    }
    for (const section of this.sections()) {
      for (const line of section.lines) {
        if (line.unit) {
          labels.add(line.unit);
        }
      }
    }
    for (const draft of this.newLineDrafts.values()) {
      if (draft.unit) {
        labels.add(draft.unit);
      }
    }

    const options = Array.from(labels)
      .sort((a, b) => a.localeCompare(b))
      .map(label => ({ label, value: label, unitId: unitIds.get(label) ?? null }));

    return options;
  }

  // The little cross on a unit option: takes it off the company's list. The
  // click must not also pick the option (it'd select it in the line that
  // opened the dropdown), hence stopPropagation. A line already using that
  // unit keeps it - it's free text there.
  archiveUnit(unitId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    this.resourceUnitService.archiveUnit(unitId).subscribe({
      next: () => this.resourceUnits.update(units => units.filter(unit => unit.id !== unitId)),
      error: err => console.error('document-form : ' + err)
    });
  }

  // The footer of every unit p-select (an input + a "+" button, the same
  // way project-list.ts adds a chantier type): persists the typed label as a
  // resource_units row (get-or-create - see resource_unit.service.ts, it
  // also brings an archived one back) and then applies it to that select's
  // own line - `apply` is whatever setter that particular select needs
  // (updateLine's patch for an already-added line, or a plain draft.unit
  // assignment for the inline add-row).
  addUnit(label: string, apply: (unit: string) => void): void {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }

    this.resourceUnitService.createUnit(trimmed).subscribe({
      next: unit => {
        this.resourceUnits.update(units => units.some(u => u.id === unit.id) ? units : [...units, unit]);
        apply(unit.label);
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // Edits an already-added line in place (type/label/quantity/unit/price) -
  // no need to remove and re-add it anymore. Doesn't touch resource_id: a
  // line built from a catalog/chantier resource stays linked to it even
  // once its values are hand-adjusted here.
  updateLine(sectionId: number, lineId: number, patch: Partial<DraftLine>): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId
        ? { ...s, lines: s.lines.map(l => l.id === lineId ? { ...l, ...patch } : l) }
        : s
      )
    );
  }

  removeLine(sectionId: number, lineId: number): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, lines: s.lines.filter(l => l.id !== lineId) } : s)
    );
  }

  lineQuantityLabel(type: DraftLineType): string {
    return type === 'MATERIAL' ? 'Quantité' : 'Temps (h)';
  }

  lineTotal(line: DraftLine): number {
    return round2((line.quantity ?? 0) * line.unit_price * (1 - line.discount / 100));
  }

  sectionTotal(section: DraftSection): number {
    return round2(section.lines.reduce((sum, line) => sum + this.lineTotal(line), 0));
  }

  cancel(): void {
    this.router.navigate(['/documents'], { queryParams: { type: this.type } });
  }

  async submit(): Promise<void> {
    if (this.locked()) {
      return;
    }

    const clientId = this.selectedClientId();
    if (clientId === null) {
      this.errorMessage.set('Choisis un client.');
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    try {
      const editingId = this.editingDocumentId();

      if (editingId !== null) {
        await firstValueFrom(this.documentService.updateDocument(editingId, {
          client_id: clientId,
          address_id: this.addressId,
          reference_client: this.referenceClient.trim() || null,
          date: this.date.toISOString(),
          discount: this.discount(),
          vat_rate: this.vatRate(),
          payment_terms: this.paymentTerms,
          due_date: this.dueDateForApi(),
          introduction: this.introduction(),
          conclusion: this.conclusion(),
        }));

        await this.replaceSectionsAndLines(editingId);

        this.router.navigate(['/documents'], { queryParams: { type: this.type } });
        return;
      }

      const document = await firstValueFrom(this.documentService.createDocument({
        type: this.type,
        client_id: clientId,
        address_id: this.addressId,
        reference_client: this.referenceClient.trim() || null,
        // A QUOTE never has one (forced null server-side regardless); an
        // INVOICE points at the picked chantier's own PROJECT document, not
        // the Project row's id (see selectedProjectDocumentId).
        parent_document_id: this.type === 'INVOICE' ? this.selectedProjectDocumentId : null,
        date: this.date.toISOString(),
        discount: this.discount(),
        vat_rate: this.vatRate(),
        payment_terms: this.paymentTerms,
        due_date: this.dueDateForApi(),
        introduction: this.introduction(),
        conclusion: this.conclusion(),
        // Every document starts as a draft - status changes happen
        // afterwards, not at creation.
        status: 'DRAFT',
      }));

      await this.createSectionsAndLines(document.id);

      this.router.navigate(['/documents'], { queryParams: { type: this.type } });
    } catch (err) {
      console.error('document-form : ' + err);
      this.submitting.set(false);
      this.errorMessage.set('Impossible d\'enregistrer le document. Réessaie dans un instant.');
    }
  }

  // Sections (then their lines) sequentially, not in parallel - a line needs
  // its section's real id, which only exists once that section's own POST
  // resolves.
  private async createSectionsAndLines(documentId: number): Promise<void> {
    for (const section of this.sections()) {
      const createdSection = await firstValueFrom(this.documentSectionService.createSection({
        document_id: documentId,
        title: section.title,
        description: section.description.trim() || null,
        // No scheduling UI on this page yet (see document_sections'
        // date_start/date_end - a QUOTE/INVOICE's own sections don't need
        // one, only a chantier's might, handled separately).
        date_start: null,
        date_end: null,
        note: null,
      }));

      for (const line of section.lines) {
        await firstValueFrom(this.documentLineService.createLine({
          document_id: documentId,
          section_id: createdSection.id,
          type: line.type,
          label: line.label,
          quantity: line.quantity ?? 0,
          unit: line.unit,
          unit_price: line.unit_price,
          discount: line.discount,
          resource_id: line.resource_id,
        }));
      }
    }
  }

  // "Modifier" has no per-line diffing against what's already stored - it
  // archives every currently-active section/line (same archive-instead-of-
  // delete convention as everywhere else) and recreates them all fresh from
  // this page's edited draft, exactly like a brand new document's own
  // sections/lines. Lines first, then sections - so nothing active is ever
  // left under an already-archived section, even for the brief moment while
  // this loop is running.
  private async replaceSectionsAndLines(documentId: number): Promise<void> {
    const [existingSections, existingLines] = await Promise.all([
      firstValueFrom(this.documentSectionService.getSections(documentId)),
      firstValueFrom(this.documentLineService.getLines(documentId)),
    ]);

    for (const line of existingLines) {
      await firstValueFrom(this.documentLineService.archiveLine(line.id));
    }
    for (const section of existingSections) {
      await firstValueFrom(this.documentSectionService.archiveSection(section.id));
    }

    await this.createSectionsAndLines(documentId);
  }

}
