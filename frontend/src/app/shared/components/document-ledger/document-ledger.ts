import { Component, contentChild, inject, input, OnInit, signal, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { PricePipe } from '../../pipes/price.pipe';
import { forkJoin } from 'rxjs';
import { DocumentSectionService } from '../../../features/documents/document-section.service';
import { DocumentLineService } from '../../../features/documents/document-line.service';
import { DocumentSection } from '../../models/document-section';
import { DocumentLine } from '../../models/document-line';
import { SectionDatePipe } from '../../pipes/section-date.pipe';

// Stable shared reference for "no lines yet" - see document-list.ts's own
// original EMPTY_LINES (this component replaces that file's and
// project-list.ts's own near-identical copies of this whole thing) for why
// a freshly-allocated [] on every call would be a problem here.
const EMPTY_LINES: DocumentLine[] = [];

// A document's own sections + their lines (its resource ledger, whether
// that document is a QUOTE/INVOICE or the PROJECT document backing a
// chantier), read-only, fetched once when mounted. Was copy-pasted nearly
// identically into document-list.ts and project-list.ts (each maintaining
// its own fetch/cache/render for the exact same data shape) - this is that
// logic pulled into one place.
//
// The per-section header (title/description/period by default) can be
// swapped by projecting a `#sectionHeader` template - project-list.ts uses
// this to show editable date pickers instead of a read-only period. The
// lines table itself is never customizable - it's always read-only.
@Component({
  selector: 'app-document-ledger',
  standalone: true,
  imports: [PricePipe, NgTemplateOutlet, SectionDatePipe],
  templateUrl: './document-ledger.html'
})
export class DocumentLedger implements OnInit {

  documentId = input.required<number>();

  // Optional - a caller projects <ng-template #sectionHeader let-section>
  // to replace the default title/description/period header per section.
  sectionHeader = contentChild<TemplateRef<{ $implicit: DocumentSection }>>('sectionHeader');

  // 1 (default, document-list.ts's own usage) stacks sections in a single
  // column; 2 (project-list.ts's own usage) lays them out two per row
  // instead - purely a display preference, the data/fetch logic below
  // doesn't care either way.
  columns = input<1 | 2>(1);

  private documentSectionService = inject(DocumentSectionService);
  private documentLineService = inject(DocumentLineService);

  loading = signal(true);
  sections = signal<DocumentSection[]>([]);
  private linesBySectionId = signal(new Map<number, DocumentLine[]>());

  ngOnInit(): void {
    this.refresh();
  }

  // Public so a caller that edits something inside a projected section
  // header (project-list.ts's own date pickers) can ask for a reload once
  // its own save completes - this component owns the fetch, the caller
  // doesn't get to reach into its signals directly.
  refresh(): void {
    this.loading.set(true);
    forkJoin({
      sections: this.documentSectionService.getSections(this.documentId()),
      lines: this.documentLineService.getLines(this.documentId())
    }).subscribe({
      next: ({ sections, lines }) => {
        this.sections.set(sections);
        const linesBySectionId = new Map<number, DocumentLine[]>();
        for (const section of sections) {
          linesBySectionId.set(section.id, lines.filter(line => line.section_id === section.id));
        }
        this.linesBySectionId.set(linesBySectionId);
        this.loading.set(false);
      },
      error: err => {
        console.error('document-ledger : ' + err);
        this.loading.set(false);
      }
    });
  }

  linesFor(section: DocumentSection): DocumentLine[] {
    return this.linesBySectionId().get(section.id) ?? EMPTY_LINES;
  }
}
