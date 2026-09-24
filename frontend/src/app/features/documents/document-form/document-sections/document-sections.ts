import { Component, OnInit, computed, inject, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { ResourceForm } from '../../../resources/resource-form/resource-form';
import { ResourceService } from '../../../resources/resource.service';
import { ResourceUnitService } from '../../../resources/resource-unit.service';
import { Resource } from '../../../../shared/models/resource';
import { ResourceUnit } from '../../../../shared/models/resource-unit';
import { DocumentType } from '../../../../shared/models/document';
import { PricePipe } from '../../../../shared/pipes/price.pipe';
import { TabIndentDirective } from '../../../../shared/directives/tab-indent.directive';
import { DraftLine, DraftLineType, DraftSection, lineTotal, nextDraftId, sectionTotal, usedResourceIds } from '../document-draft';

// The "Détails" block of the document form: its sections and, in each, a
// table of lines with an inline "add a line" row, a catalog picker and the
// unit picker. `sections` is the form's own state (two-way): everything here
// edits it in place, the form reads it back to compute totals and to save.
// The catalog (resources) and the unit list are this component's own - the
// form doesn't need them.
@Component({
  selector: 'app-document-sections',
  standalone: true,
  imports: [FormsModule, PricePipe, InputText, InputNumber, Textarea, Select, Button, Dialog, ResourceForm, TabIndentDirective],
  templateUrl: './document-sections.html',
  host: { class: 'block' },
})
export class DocumentSections implements OnInit {

  private resourceService = inject(ResourceService);
  private resourceUnitService = inject(ResourceUnitService);

  sections = model<DraftSection[]>([]);
  type = input.required<DocumentType>();

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

  // The company's own customizable unit list (see zz_migrations/
  // 006_create_resource_units.sql) - source for the "unit" picker on every
  // line (unitOptions/addUnit).
  private resourceUnits = signal<ResourceUnit[]>([]);

  availableCatalogResourceOptions = computed(() => {
    const used = usedResourceIds(this.sections());
    return this.resources()
      .filter(resource => !used.has(resource.id))
      .map(resource => ({ label: resource.name, value: resource.id }));
  });

  lineTypeOptions: { label: string; value: DraftLineType }[] = [
    { label: 'Matériel', value: 'MATERIAL' },
    { label: 'Service', value: 'SERVICE' },
  ];

  // One pending "new line" draft per section, keyed by section id, so each
  // section's little inline add-row keeps its own in-progress values.
  private newLineDrafts = new Map<number, DraftLine>();

  ngOnInit(): void {
    this.resourceService.getResources().subscribe({
      next: data => this.resources.set(data),
      error: err => console.error('document-sections : ' + err)
    });

    this.resourceUnitService.getUnits().subscribe({
      next: data => this.resourceUnits.set(data),
      error: err => console.error('document-sections : ' + err)
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
      { id: nextDraftId(), title: '', description: '', lines: [] }
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

    const line: DraftLine = { ...draft, id: nextDraftId() };

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

    return Array.from(labels)
      .sort((a, b) => a.localeCompare(b))
      .map(label => ({ label, value: label, unitId: unitIds.get(label) ?? null }));
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
      error: err => console.error('document-sections : ' + err)
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
      error: err => console.error('document-sections : ' + err)
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

}
