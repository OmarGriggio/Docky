import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
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
import { Panel } from 'primeng/panel';
import { DocumentService } from '../document.service';
import { DocumentSectionService } from '../document-section.service';
import { DocumentLineService } from '../document-line.service';
import { DocumentTemplateService } from '../document-template.service';
import { ClientService } from '../../clients/client.service';
import { ProjectService } from '../../projects/project.service';
import { ProjectResourceService } from '../../projects/project-resource.service';
import { ResourceService } from '../../resources/resource.service';
import { CompanyService } from '../../profile/company.service';
import { AuthService } from '../../auth/auth.service';
import { Client } from '../../../shared/models/client';
import { Address } from '../../../shared/models/address';
import { Project } from '../../../shared/models/project';
import { Resource } from '../../../shared/models/resource';
import { ProjectResource } from '../../../shared/models/project-resource';
import { Company } from '../../../shared/models/company';
import { DocumentType } from '../../../shared/models/document';
import { clientDisplayName } from '../../../shared/utils/display';

const TYPE_LABELS: Record<DocumentType, string> = {
  QUOTE: 'offre',
  INVOICE: 'facture',
};

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
  // already-used resource out of the "add a resource" pickers below (see
  // availableCatalogResourceOptions/availableProjectResourceOptions).
  resource_id: number | null;
}

interface DraftSection {
  id: number;
  title: string;
  lines: DraftLine[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

let nextId = 1;

// A full page rather than a small dialog - the whole point is to look like a
// simplified live preview of the document being created. Sections/lines are
// built up as pure local state while editing, but "Valider" actually creates
// everything server-side: POST /document, then POST /document-section per
// section, then POST /document-line per line under it (sequentially - each
// line needs its real section_id, which only exists once that section's own
// create resolves). On success, navigates to the created document's detail
// page, where the server-generated number ends up shown.
@Component({
  selector: 'app-document-form',
  standalone: true,
  imports: [FormsModule, DecimalPipe, InputText, InputNumber, Textarea, FloatLabel, Select, DatePicker, Button, Card, Panel],
  templateUrl: './document-form.html',
  styleUrl: './document-form.css',
})
export class DocumentForm implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private documentService = inject(DocumentService);
  private documentSectionService = inject(DocumentSectionService);
  private documentLineService = inject(DocumentLineService);
  private documentTemplateService = inject(DocumentTemplateService);
  private clientService = inject(ClientService);
  private projectService = inject(ProjectService);
  private projectResourceService = inject(ProjectResourceService);
  private resourceService = inject(ResourceService);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);

  company = signal<Company | null>(null);
  companyLogoUrl = computed(() => this.companyService.getLogoUrl(this.company()?.logo ?? null));

  clients = signal<Client[]>([]);
  clientOptions = computed(() =>
    this.clients().map(client => ({ label: clientDisplayName(client), value: client.id }))
  );

  projects = signal<Project[]>([]);
  // Only the selected client's own COMPLETED projects make sense to invoice
  // - an in-progress one's quantities aren't final yet (see
  // document.service.ts's addDocumentServ, which rejects it server-side
  // too). Only ever shown for an INVOICE - a QUOTE can never target a
  // project at all (see zz_docs/Decisions.md: a project is born from an
  // accepted quote, never the other way around).
  projectOptions = computed(() => {
    const clientId = this.selectedClientId();
    if (clientId === null) {
      return [];
    }
    return this.projects()
      .filter(project => project.client_id === clientId && project.status === 'COMPLETED')
      .map(project => ({ label: project.name, value: project.id }));
  });

  selectedClientId = signal<number | null>(null);
  selectedClientAddress = signal<Address | null>(null);
  selectedProjectId: number | null = null;

  // The company's full resource catalog - source for the "Ajouter depuis le
  // catalogue" picker (QUOTE: this is how the need actually gets defined,
  // see zz_docs/Decisions.md).
  resources = signal<Resource[]>([]);
  // The selected project's own linked resources (project_resources) paired
  // with their catalog resource, fetched as soon a project is picked - feeds
  // both "Charger chantier" (bulk import) and each section's own "Ajouter
  // une ressource du chantier" picker (INVOICE only). Each link's own
  // quantity/unit_price (the project's real, adjusted amounts - see
  // zz_migrations/000_base.sql) is what gets copied onto the line, not a
  // fixed "1 at catalog price" default.
  projectResources = signal<{ link: ProjectResource; resource: Resource }[]>([]);
  // Ids of sections that came from "Charger chantier" - tracked so a
  // re-selection (or clearing the project) replaces exactly these, never a
  // section the user built by hand.
  private importedSectionIds = new Set<number>();

  // A resource already used as a line anywhere in the document (however it
  // got there - catalog picker, bulk import, or the per-section chantier
  // picker) no longer makes sense to offer again.
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

  availableProjectResourceOptions = computed(() =>
    this.projectResources()
      .filter(({ resource }) => !this.usedResourceIds().has(resource.id))
      .map(({ resource }) => ({ label: resource.name, value: resource.id }))
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

  date = new Date();
  introduction = '';
  conclusion = '';
  paymentTerms = '';
  discount = 0;
  vatRate = 8.1;

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

  savingTemplate = signal(false);
  templateSaveMessage = signal<string | null>(null);

  documentSubtotal = computed(() =>
    round2(this.sections().reduce((sum, section) => sum + this.sectionTotal(section), 0))
  );

  documentTotalAfterDiscount = computed(() =>
    round2(this.documentSubtotal() * (1 - this.discount / 100))
  );

  documentTotalInclVat = computed(() =>
    round2(this.documentTotalAfterDiscount() * (1 + this.vatRate / 100))
  );

  ngOnInit(): void {
    // A queryParamMap subscription, not a one-time snapshot read: this route
    // (documents/new) stays the same whether it's reached with ?type=QUOTE
    // or ?type=INVOICE, so Angular reuses the same component instance across
    // navigations between them - a snapshot taken once in ngOnInit would go
    // stale the second time this page is visited without a full reload.
    this.route.queryParamMap.subscribe(params => {
      const typeParam = params.get('type') as DocumentType | null;
      this.type = (typeParam === 'QUOTE' || typeParam === 'INVOICE') ? typeParam : 'QUOTE';
      this.loadTemplate(this.type);
    });

    this.clientService.getClients().subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-form : ' + err)
    });

    this.projectService.getProjects().subscribe({
      next: data => this.projects.set(data),
      error: err => console.error('document-form : ' + err)
    });

    this.resourceService.getResources().subscribe({
      next: data => this.resources.set(data),
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

  // Fills introduction/conclusion from this type's saved template, if any -
  // fine to always apply outright since a fresh document starts with both
  // empty either way, no "only if already blank" check needed. Called from
  // the queryParamMap subscription above, both on first load and on a
  // reused-component navigation to the other type.
  private loadTemplate(type: DocumentType): void {
    this.documentTemplateService.getTemplate(type).subscribe({
      next: template => {
        this.introduction = template?.introduction ?? '';
        this.conclusion = template?.conclusion ?? '';
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // Promotes this document's current introduction/conclusion to be the
  // saved default for its type (QUOTE/INVOICE) - the same PUT the Profile
  // page's "Modèles de documents" card uses, just triggered inline while
  // writing a document instead of from a separate settings page.
  saveAsDefaultTemplate(): void {
    this.savingTemplate.set(true);
    this.templateSaveMessage.set(null);

    this.documentTemplateService.upsertTemplate(this.type, {
      introduction: this.introduction,
      conclusion: this.conclusion,
    }).subscribe({
      next: () => {
        this.savingTemplate.set(false);
        this.templateSaveMessage.set(`Modèle ${this.typeLabel} par défaut mis à jour.`);
      },
      error: err => {
        console.error('document-form : ' + err);
        this.savingTemplate.set(false);
        this.templateSaveMessage.set('Impossible d\'enregistrer le modèle.');
      }
    });
  }

  onClientChange(clientId: number | null): void {
    this.selectedClientId.set(clientId);
    // A project picked for a previous client no longer makes sense - and
    // neither does whatever it had imported.
    this.selectedProjectId = null;
    this.clearImportedSections();

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

  // Picking a project doesn't prefill any section/line by itself - only
  // invalidates whatever the previous project had bulk-imported (if any),
  // since it no longer applies. It does fetch the new project's own linked
  // resources right away though, so each section's "Ajouter une ressource du
  // chantier" picker (and "Charger chantier") has something to offer as soon
  // as a project is picked, with no extra step required.
  // INVOICE only - fetches the picked project's own linked resources (with
  // their real, adjusted quantity/price) so "Charger chantier" and the
  // per-section picker have something to offer.
  onProjectChange(projectId: number | null): void {
    this.selectedProjectId = projectId;
    this.clearImportedSections();

    if (projectId === null) {
      this.projectResources.set([]);
      return;
    }

    this.projectResourceService.getResourcesForProject(projectId).subscribe({
      next: links => {
        const resourceById = new Map(this.resources().map(r => [r.id, r]));
        this.projectResources.set(
          links
            .map(link => {
              const resource = resourceById.get(link.resource_id);
              return resource ? { link, resource } : null;
            })
            .filter((entry): entry is { link: ProjectResource; resource: Resource } => entry !== null)
        );
      },
      error: err => console.error('document-form : ' + err)
    });
  }

  // Pre-fills the document body from project_resources: one "Matériel"
  // section for the selected project's linked MATERIAL resources, one
  // "Service" section for its linked SERVICE ones (only created if that
  // group isn't empty, and skips whichever resource of either group is
  // already used elsewhere in the document - same rule as the per-section
  // picker). Replaces whatever a previous load had imported - never touches
  // a section the user added by hand.
  loadProjectResources(): void {
    if (this.selectedProjectId === null) {
      return;
    }

    this.clearImportedSections();

    const usedIds = this.usedResourceIds();
    const available = this.projectResources().filter(({ resource }) => !usedIds.has(resource.id));
    const materials = available.filter(({ resource }) => resource.type === 'MATERIAL');
    const services = available.filter(({ resource }) => resource.type === 'SERVICE');

    const importedSections: DraftSection[] = [];
    if (materials.length > 0) {
      importedSections.push(this.sectionFromProjectResources('Matériel', materials));
    }
    if (services.length > 0) {
      importedSections.push(this.sectionFromProjectResources('Service', services));
    }

    for (const section of importedSections) {
      this.importedSectionIds.add(section.id);
    }
    this.sections.update(sections => [...sections, ...importedSections]);
  }

  // Adds a single resource from the selected project as a new line at the
  // end of the given section - the "Ajouter une ressource du chantier"
  // picker inside each section (INVOICE only).
  addResourceLine(sectionId: number, resourceId: number | null): void {
    if (resourceId === null) {
      return;
    }

    const entry = this.projectResources().find(({ resource }) => resource.id === resourceId);
    if (!entry) {
      return;
    }

    const line = this.lineFromResource(entry.resource, entry.link.quantity, entry.link.unit_price ?? entry.resource.selling_price);
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, lines: [...s.lines, line] } : s)
    );
  }

  // Adds a single resource from the company's full catalog as a new line at
  // the end of the given section - the "Ajouter depuis le catalogue" picker
  // inside each section (QUOTE: the only way to add a priced line at all,
  // since there's no project to pull from yet).
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

  private clearImportedSections(): void {
    if (this.importedSectionIds.size === 0) {
      return;
    }
    this.sections.update(sections => sections.filter(s => !this.importedSectionIds.has(s.id)));
    this.importedSectionIds.clear();
  }

  private sectionFromProjectResources(title: string, items: { link: ProjectResource; resource: Resource }[]): DraftSection {
    return {
      id: nextId++,
      title,
      lines: items.map(({ link, resource }) => this.lineFromResource(resource, link.quantity, link.unit_price ?? resource.selling_price)),
    };
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
      { id: nextId++, title: '', lines: [] }
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
    this.router.navigate(['/documents']);
  }

  async submit(): Promise<void> {
    const clientId = this.selectedClientId();
    if (clientId === null) {
      this.errorMessage.set('Choisis un client.');
      return;
    }

    this.errorMessage.set(null);
    this.submitting.set(true);

    try {
      const document = await firstValueFrom(this.documentService.createDocument({
        type: this.type,
        client_id: clientId,
        project_id: this.selectedProjectId,
        date: this.date.toISOString(),
        discount: this.discount,
        vat_rate: this.vatRate,
        payment_terms: this.paymentTerms,
        due_date: null,
        introduction: this.introduction,
        conclusion: this.conclusion,
        parent_document_id: null,
        // Every document starts as a draft - status changes happen
        // afterwards, not at creation.
        status: 'DRAFT',
      }));

      // Sections (then their lines) sequentially, not in parallel - a line
      // needs its section's real id, which only exists once that section's
      // own POST resolves.
      for (const section of this.sections()) {
        const createdSection = await firstValueFrom(this.documentSectionService.createSection({
          document_id: document.id,
          title: section.title,
        }));

        for (const line of section.lines) {
          await firstValueFrom(this.documentLineService.createLine({
            document_id: document.id,
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

      // The server-generated number is shown on the document's own detail
      // page, which is also where lines/sections could be edited further.
      this.router.navigate(['/documents', document.id]);
    } catch (err) {
      console.error('document-form : ' + err);
      this.submitting.set(false);
      this.errorMessage.set('Impossible de créer le document. Réessaie dans un instant.');
    }
  }

}
