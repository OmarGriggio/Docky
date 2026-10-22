import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DocumentSectionService } from '../../documents/document-section.service';
import { DocumentLineService } from '../../documents/document-line.service';
import { DocumentService } from '../../documents/document.service';
import { ResourceService } from '../../resources/resource.service';
import { Project } from '../../../shared/models/project';
import { Resource } from '../../../shared/models/resource';
import { DocumentLineType } from '../../../shared/models/document-line';
import { hasTimeComponent } from '../../../shared/utils/display';
import { TabIndentDirective } from '../../../shared/directives/tab-indent.directive';

interface DraftLine {
  id: number;
  type: DocumentLineType;
  label: string;
  quantity: number | null;
  unit: string | null;
  unit_price: number;
  resource_id: number | null;
}

interface DraftSection {
  id: number;
  title: string;
  description: string | null;
  // Kept as Date (not the raw ISO string) so p-datepicker can bind to it
  // directly - a real local instant now (see hasTimeComponent's own
  // comment in display.ts), not a pure calendar date, so a plain
  // `new Date(iso)`/`.toISOString()` round-trip is exactly right here.
  date_start: Date | null;
  date_end: Date | null;
  // Not editable here (it's written from the calendar), only carried
  // through so saving this page doesn't wipe it.
  note: string | null;
  lines: DraftLine[];
}

let nextId = 1;

// The chantier's own resource ledger IS its backing PROJECT document now
// (project_resources is gone - see zz_docs/Decisions.md and
// document.service.ts's acceptQuoteServ on the backend), so this edits that
// document's own sections/lines. Same "local draft, one Save button" pattern
// as document-form.ts's own edit mode - the whole draft goes to
// PUT /document/:id/content, which archives the old content and recreates it
// in one transaction (document_lines has no in-place update endpoint).
@Component({
  selector: 'app-project-resources',
  standalone: true,
  imports: [FormsModule, PricePipe, Button, Select, InputText, InputNumber, Textarea, DatePicker, TabIndentDirective, TranslocoPipe],
  templateUrl: './project-resources.html',
})
export class ProjectResources implements OnInit {

  project = input.required<Project>();

  private documentSectionService = inject(DocumentSectionService);
  private documentLineService = inject(DocumentLineService);
  private documentService = inject(DocumentService);
  private resourceService = inject(ResourceService);
  private transloco = inject(TranslocoService);

  // Once a chantier is closed, its resource ledger is exactly what an
  // invoice would be built from - no more changes past that point (see
  // zz_migrations/000_base.sql's comment on projects.status).
  readonly = computed(() => this.project().status === 'COMPLETED');

  resources = signal<Resource[]>([]);
  sections = signal<DraftSection[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal<string | null>(null);

  private usedResourceIds = computed(() =>
    new Set(
      this.sections()
        .flatMap(section => section.lines)
        .map(line => line.resource_id)
        .filter((id): id is number => id !== null)
    )
  );

  availableResourceOptions = computed(() =>
    this.resources()
      .filter(resource => !this.usedResourceIds().has(resource.id))
      .map(resource => ({ label: resource.name, value: resource.id }))
  );

  ngOnInit(): void {
    this.resourceService.getResources().subscribe({
      next: data => this.resources.set(data),
      error: err => console.error('project-resources : ' + err)
    });

    this.load();
  }

  private load(): void {
    this.loading.set(true);

    const documentId = this.project().document_id;
    Promise.all([
      firstValueFrom(this.documentSectionService.getSections(documentId)),
      firstValueFrom(this.documentLineService.getLines(documentId)),
    ]).then(([sections, lines]) => {
      this.sections.set(
        [...sections]
          .sort((a, b) => a.position - b.position)
          .map(section => ({
            id: nextId++,
            title: section.title,
            description: section.description,
            date_start: section.date_start ? new Date(section.date_start) : null,
            date_end: section.date_end ? new Date(section.date_end) : null,
            note: section.note,
            lines: lines
              .filter(line => line.section_id === section.id)
              .sort((a, b) => a.position - b.position)
              .map(line => ({
                id: nextId++,
                type: line.type,
                label: line.label,
                quantity: line.quantity,
                unit: line.unit,
                unit_price: line.unit_price,
                resource_id: line.resource_id,
              })),
          }))
      );
      this.loading.set(false);
    }).catch(err => {
      console.error('project-resources : ' + err);
      this.errorMessage.set(this.transloco.translate('projects.resources.loadError'));
      this.loading.set(false);
    });
  }

  addSection(): void {
    this.sections.update(sections => [
      ...sections,
      { id: nextId++, title: '', description: null, date_start: null, date_end: null, note: null, lines: [] }
    ]);
  }

  removeSection(sectionId: number): void {
    this.sections.update(sections => sections.filter(s => s.id !== sectionId));
  }

  updateSectionTitle(sectionId: number, title: string): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, title } : s)
    );
  }

  updateSectionDescription(sectionId: number, description: string): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, description: description || null } : s)
    );
  }

  updateSectionDate(sectionId: number, field: 'date_start' | 'date_end', value: Date | null): void {
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, [field]: value } : s)
    );
  }

  // Both pickers show a time field only once one's actually set on either
  // date (see hasTimeComponent's own comment in display.ts) - otherwise an
  // untouched all-day section would show a misleading "00:00" the moment
  // you open its picker.
  sectionHasTime(section: DraftSection): boolean {
    return (!!section.date_start && hasTimeComponent(section.date_start))
      || (!!section.date_end && hasTimeComponent(section.date_end));
  }

  // Starts at quantity 0 - nothing's been used on site yet for a resource
  // just added to the ledger (same default project_resources itself used to
  // have).
  addResourceLine(sectionId: number, resourceId: number | null): void {
    if (resourceId === null) {
      return;
    }
    const resource = this.resources().find(r => r.id === resourceId);
    if (!resource) {
      return;
    }

    const line: DraftLine = {
      id: nextId++,
      type: resource.type,
      label: resource.name,
      quantity: 0,
      unit: resource.unit,
      unit_price: resource.selling_price,
      resource_id: resource.id,
    };
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, lines: [...s.lines, line] } : s)
    );
  }

  lineTotal(line: DraftLine): number {
    return (line.quantity ?? 0) * line.unit_price;
  }

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

  async save(): Promise<void> {
    if (this.readonly()) {
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);

    const documentId = this.project().document_id;

    try {
      // One request, one transaction server-side (see
      // DocumentService.replaceContent) - all saved or nothing.
      await firstValueFrom(this.documentService.replaceContent(documentId, this.sections().map(section => ({
        title: section.title || this.transloco.translate('projects.resources.defaultSectionTitle'),
        description: section.description,
        date_start: section.date_start ? section.date_start.toISOString() : null,
        date_end: section.date_end ? section.date_end.toISOString() : null,
        note: section.note,
        lines: section.lines.map(line => ({
          type: line.type,
          label: line.label,
          quantity: line.quantity ?? 0,
          unit: line.unit,
          unit_price: line.unit_price,
          discount: 0,
          resource_id: line.resource_id,
        })),
      }))));

      this.load();
    } catch (err) {
      console.error('project-resources : ' + err);
      this.errorMessage.set(this.transloco.translate('projects.resources.saveError'));
    } finally {
      this.saving.set(false);
    }
  }

}
