import { Component, OnInit, computed, inject, input, model, signal } from '@angular/core';
import { PermissionService } from '../../../../shared/services/permission.service';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { ResourceForm } from '../../../resources/resource-form/resource-form';
import { ResourceService } from '../../../resources/resource.service';
import { UnitSelect } from '../../../resources/unit-select/unit-select';
import { UnitListStore } from '../../../resources/unit-list.store';
import { Resource } from '../../../../shared/models/resource';
import { DocumentType } from '../../../../shared/models/document';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { TabIndentDirective } from '../../../../shared/directives/tab-indent.directive';
import { DraftLine, DraftLineType, DraftSection, blankSection, lineTotal, nextDraftId, sectionTotal, usedResourceIds, findSameResource } from '../document-draft';
import { NotificationService } from '../../../../shared/services/notification.service';

// The "Détails" block of the document form: its sections and, in each, a
// table of lines with an inline "add a line" row, a catalog picker and the
// unit picker. `sections` is the form's own state (two-way): everything here
// edits it in place, the form reads it back to compute totals and to save.
// The catalog (resources) is this component's own, and so is the unit list
// its lines' pickers share (UnitListStore) - the form doesn't need them.
@Component({
  selector: 'app-document-sections',
  standalone: true,
  imports: [FormsModule, PricePipe, InputText, InputNumber, Textarea, Select, Button, Dialog, ResourceForm, UnitSelect, TabIndentDirective, TranslocoPipe],
  // One unit list for every line's picker (see UnitListStore).
  providers: [UnitListStore],
  templateUrl: './document-sections.html',
  host: { class: 'block' },
})
export class DocumentSections implements OnInit {

  private notifications = inject(NotificationService);
  private resourceService = inject(ResourceService);
  private transloco = inject(TranslocoService);
  private permissions = inject(PermissionService);
  // "Ajouter une ressource" from the catalog picker - the catalog writable
  // (an employee's permissions).
  canCreateResource = computed(() => this.permissions.can('catalog', 'WRITE'));

  sections = model<DraftSection[]>([]);
  type = input.required<DocumentType>();
  // A document that can no longer be edited (see document-form.ts's
  // isOpenForEditing): every field read-only, every add/remove hidden.
  locked = input(false);
  // Empty required fields outlined in red - see document-form.ts.
  showRequired = input(false);

  readonly lineTotal = lineTotal;
  readonly sectionTotal = sectionTotal;

  // The company's full resource catalog - source for the "Ajouter depuis le
  // catalogue"/"Ajouter une ressource" picker (see zz_docs/Decisions.md: a
  // QUOTE has no project to pull from yet, it's how the need gets defined in
  // the first place; an INVOICE could offer the project's own resource
  // ledger instead, but picking from the full catalog the same way keeps
  // both types consistent and doesn't block a correction that ledger
  // didn't anticipate).
  resources = signal<Resource[]>([]);

  // Per section: a resource already a line of that section isn't offered
  // again there - another section can still take it (the same material in
  // two parts of the work).
  catalogOptionsBySection = computed(() => {
    const options = this.resources()
      .map(resource => ({ label: resource.reference ? `${resource.name} — ${resource.reference}` : resource.name, value: resource.id }));
    return new Map(this.sections().map(section => {
      const used = usedResourceIds([section]);
      return [section.id, options.filter(option => !used.has(option.value))];
    }));
  });

  // A catalog resource's reference number, shown under the label of a line
  // made from it - when it has one.
  resourceReferences = computed(() =>
    new Map(this.resources().filter(resource => resource.reference).map(resource => [resource.id, resource.reference!]))
  );

  private materialLabel = translateSignal('nav.material');
  private serviceLabel = translateSignal('nav.service');

  lineTypeOptions = computed<{ label: string; value: DraftLineType }[]>(() => [
    { label: this.materialLabel(), value: 'MATERIAL' },
    { label: this.serviceLabel(), value: 'SERVICE' },
  ]);

  // One pending "new line" draft per section, keyed by section id, so each
  // section's little inline add-row keeps its own in-progress values.
  private newLineDrafts = new Map<number, DraftLine>();

  ngOnInit(): void {
    this.resourceService.getResources().subscribe({
      next: data => this.resources.set(data),
      error: err => this.notifications.error('document-sections', err)
    });

  }

  // Adds a single resource from the company's full catalog as a new line at
  // the end of the given section - the per-section catalog picker, used by
  // both types ("Ajouter depuis le catalogue"/"Ajouter une ressource", see
  // the template).
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

  private lineFromResource(resource: Resource, quantity: number, unit_price: number): DraftLine {
    return {
      id: nextDraftId(),
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
      blankSection()
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

  // The add-row whose required fields were missing on its last "+" or
  // "Ajouter aux ressources" - outlined in red until its next attempt.
  invalidDraftSectionId = signal<number | null>(null);
  savingResourceSectionId = signal<number | null>(null);

  addLine(sectionId: number): void {
    const draft = this.newLineFor(sectionId);
    if (!draft.label.trim()) {
      this.invalidDraftSectionId.set(sectionId);
      this.notifications.warn('documents.sections.lineLabelRequired');
      return;
    }
    this.pushDraftLine(sectionId, draft, draft.resource_id);
  }

  // `typed`: the add-row's values as they were when its button was clicked -
  // the row stays editable while a resource is being created.
  private pushDraftLine(sectionId: number, typed: DraftLine, resource_id: number | null): void {
    const line: DraftLine = { ...typed, id: nextDraftId(), resource_id };
    this.sections.update(sections =>
      sections.map(s => s.id === sectionId ? { ...s, lines: [...s.lines, line] } : s)
    );
    this.newLineDrafts.set(sectionId, this.emptyLine());
    this.invalidDraftSectionId.set(null);
  }

  // The add-row's second button: the line typed in becomes a catalog
  // resource too (its type, designation, unit and selling price), then a
  // line of the section linked to it - unless the catalog already has the
  // same one (findSameResource), which is then said and nothing is created.
  addDraftToResources(sectionId: number): void {
    const draft = { ...this.newLineFor(sectionId) };
    if (!draft.label.trim() || !draft.unit?.trim()) {
      this.invalidDraftSectionId.set(sectionId);
      this.notifications.warn('documents.sections.resourceFieldsRequired');
      return;
    }
    const existing = findSameResource(draft, this.resources());
    if (existing) {
      // Already a line of this section: its picker doesn't offer it any more.
      const inSection = this.sections().find(s => s.id === sectionId)?.lines.some(line => line.resource_id === existing.id);
      this.notifications.warn(inSection ? 'documents.sections.resourceExistsInSection' : 'documents.sections.resourceExists', { code: existing.code });
      return;
    }

    this.savingResourceSectionId.set(sectionId);
    this.resourceService.createResource({
      type: draft.type,
      name: draft.label.trim(),
      unit: draft.unit.trim(),
      selling_price: draft.unit_price ?? 0,
      purchase_price: null,
      reference: null,
      parent_resource_id: null,
    }).subscribe({
      next: resource => {
        this.savingResourceSectionId.set(null);
        this.resources.update(resources => [...resources, resource]);
        this.pushDraftLine(sectionId, draft, resource.id);
        this.notifications.success('documents.sections.resourceAdded', { code: resource.code });
      },
      error: err => {
        this.savingResourceSectionId.set(null);
        this.notifications.error('document-sections', err);
      },
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
    return this.transloco.translate(type === 'MATERIAL' ? 'documents.sections.quantityFull' : 'documents.sections.timeHours');
  }

}
