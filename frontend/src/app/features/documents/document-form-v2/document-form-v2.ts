import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { ClientService } from '../../clients/client.service';
import { CompanyService } from '../../profile/company.service';
import { AuthService } from '../../auth/auth.service';
import { Client } from '../../../shared/models/client';
import { Address } from '../../../shared/models/address';
import { Company } from '../../../shared/models/company';
import { clientDisplayName } from '../../../shared/utils/display';

// A section-line type - MATERIAL uses quantity+unit, SERVICE uses time
// (hours). Purely local to this prototype for now.
type DraftLineType = 'MATERIAL' | 'SERVICE';

interface DraftLine {
  id: number;
  type: DraftLineType;
  reference: string;
  label: string;
  quantity: number | null; // MATERIAL only
  unit: string | null;     // MATERIAL only
  time: number | null;     // SERVICE only (hours)
  unitPrice: number;
  discount: number;        // %
}

interface DraftSection {
  id: number;
  title: string;
  lines: DraftLine[];
}

const round2 = (value: number) => Math.round(value * 100) / 100;

let nextId = 1;

// EXPLORATORY PROTOTYPE - not wired to the backend at all. The point of this
// page is to work out what a "document with sections, each holding typed
// lines" should look like in the UI before deciding how to model it in the
// database (the current schema only has a flat document_lines list with a
// SECTION/NOTE marker type - see the "Flexible document lines" entry in
// zz_docs/Decisions.md - this page explores a richer alternative). Client/
// company data is real (same services as document-form.ts) since that part
// is already settled; sections/lines are pure local state. "Valider" doesn't
// create anything - it just reveals the resulting draft object below, which
// is the actual deliverable of this page.
@Component({
  selector: 'app-document-form-v2',
  standalone: true,
  imports: [FormsModule, DecimalPipe, InputText, InputNumber, Textarea, FloatLabel, Select, DatePicker, Button, Card],
  templateUrl: './document-form-v2.html',
  styleUrl: './document-form-v2.css',
})
export class DocumentFormV2 implements OnInit {

  private router = inject(Router);
  private clientService = inject(ClientService);
  private companyService = inject(CompanyService);
  private authService = inject(AuthService);

  company = signal<Company | null>(null);
  companyLogoUrl = computed(() => this.companyService.getLogoUrl(this.company()?.logo ?? null));

  clients = signal<Client[]>([]);
  clientOptions = computed(() =>
    this.clients().map(client => ({ label: clientDisplayName(client), value: client.id }))
  );

  selectedClientId: number | null = null;
  selectedClientAddress = signal<Address | null>(null);

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

  showJsonPreview = signal(false);

  documentSubtotal = computed(() =>
    round2(this.sections().reduce((sum, section) => sum + this.sectionTotal(section), 0))
  );

  documentTotalAfterDiscount = computed(() =>
    round2(this.documentSubtotal() * (1 - this.discount / 100))
  );

  documentTotalInclVat = computed(() =>
    round2(this.documentTotalAfterDiscount() * (1 + this.vatRate / 100))
  );

  previewJson = computed(() => JSON.stringify(this.buildDraft(), null, 2));

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: data => this.clients.set(data),
      error: err => console.error('document-form-v2 : ' + err)
    });

    const companyId = this.authService.currentUser()?.company_id;
    if (companyId) {
      this.companyService.getCompany(companyId).subscribe({
        next: company => this.company.set(company),
        error: err => console.error('document-form-v2 : ' + err)
      });
    }
  }

  onClientChange(clientId: number | null): void {
    this.selectedClientId = clientId;

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
        console.error('document-form-v2 : ' + err);
        this.selectedClientAddress.set(null);
      }
    });
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
      reference: '',
      label: '',
      quantity: null,
      unit: null,
      time: null,
      unitPrice: 0,
      discount: 0,
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
    const qty = line.type === 'MATERIAL' ? (line.quantity ?? 0) : (line.time ?? 0);
    return round2(qty * line.unitPrice * (1 - line.discount / 100));
  }

  sectionTotal(section: DraftSection): number {
    return round2(section.lines.reduce((sum, line) => sum + this.lineTotal(line), 0));
  }

  cancel(): void {
    this.router.navigate(['/documents']);
  }

  // Doesn't create anything server-side - just builds and reveals the draft
  // object this whole page exists to shape.
  submit(): void {
    this.showJsonPreview.set(true);
  }

  private buildDraft() {
    return {
      company: this.company() ? { name: this.company()!.name, ...this.company() } : null,
      client_id: this.selectedClientId,
      client_address: this.selectedClientAddress(),
      date: this.date,
      number: '(généré automatiquement à la création)',
      introduction: this.introduction,
      sections: this.sections().map(section => ({
        title: section.title,
        lines: section.lines,
        section_total: this.sectionTotal(section),
      })),
      conclusion: this.conclusion,
      payment_terms: this.paymentTerms,
      discount: this.discount,
      vat_rate: this.vatRate,
      amount_excl_vat: this.documentTotalAfterDiscount(),
      amount_incl_vat: this.documentTotalInclVat(),
    };
  }

}
