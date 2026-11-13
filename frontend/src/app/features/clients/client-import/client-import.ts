import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TranslocoPipe, translateObjectSignal, translateSignal } from '@jsverse/transloco';
import {
  buildImportLines, guessMapping, headerRowIndex, IMPORT_FIELDS, ImportField, MAX_IMPORT_ROWS, mapsAName,
} from './import-columns';
import { MAX_FILE_BYTES, readSpreadsheet, Spreadsheet } from './spreadsheet-reader';
import { ClientImportPreview } from './client-import-preview/client-import-preview';
import { HasUnsavedChanges, LeaveConfirmation } from '../../../shared/guards/unsaved-changes.guard';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';

type Step = 'file' | 'columns' | 'preview';

// "Importer des clients" (the clients list's ⋮ menu): a spreadsheet read in
// the browser, its columns matched to Docky's fields - guessed from their
// headers, every guess changeable - then a preview of every row as the
// backend judges it (POST /client/import?dryRun=true) before the import.
@Component({
  selector: 'app-client-import',
  standalone: true,
  imports: [FormsModule, RouterLink, Card, Select, Button, TableModule, ClientImportPreview, ConfirmDialogComponent, TranslocoPipe],
  templateUrl: './client-import.html',
})
export class ClientImport implements HasUnsavedChanges {

  private router = inject(Router);
  private notifications = inject(NotificationService);

  readonly maxRows = MAX_IMPORT_ROWS;

  step = signal<Step>('file');
  reading = signal(false);
  errorMessage = signal<string | null>(null);

  fileName = signal<string | null>(null);
  sheets = signal<Spreadsheet[]>([]);
  sheetIndex = signal(0);

  private table = computed(() => this.sheets()[this.sheetIndex()]?.rows ?? []);
  private headerIndex = computed(() => headerRowIndex(this.table()));

  // One entry per column of the sheet: its header (or its letter when it has
  // none) and its value on the first row under the header, to recognize it by.
  columns = computed(() => {
    const table = this.table();
    const header = this.headerIndex();
    if (header < 0) {
      return [];
    }
    return table[header].map((title, column) => ({
      title,
      letter: columnLetter(column),
      example: table[header + 1]?.[column] ?? '',
    }));
  });

  // The field each column feeds, null to ignore it - guessed when a sheet is
  // picked (see pickSheet), changed by hand afterwards.
  mapping = signal<(ImportField | null)[]>([]);

  lines = computed(() => buildImportLines(this.table(), this.mapping()));
  rows = computed(() => this.lines().map(({ row }) => row));

  // The preview's columns: the matched fields, in the mapping screen's order -
  // the client number always, a number can be typed there even without one
  // in the file.
  previewFields = computed(() => {
    const mapped = new Set(this.mapping());
    return IMPORT_FIELDS.filter(field => field === 'client_number' || mapped.has(field));
  });

  // Done: leaving no longer loses anything (see hasUnsavedChanges).
  private done = false;
  hasName = computed(() => mapsAName(this.mapping()));
  tooManyRows = computed(() => this.rows().length > MAX_IMPORT_ROWS);
  canContinue = computed(() => this.rows().length > 0 && this.hasName() && !this.tooManyRows());

  private fieldLabels = translateObjectSignal('clients.import.fields');
  private ignoreLabel = translateSignal('clients.import.ignore');

  fieldOptions = computed(() => {
    const labels = this.fieldLabels() as Record<string, string>;
    return [
      { label: this.ignoreLabel(), value: null },
      ...IMPORT_FIELDS.map(field => ({ label: labels[field] ?? field, value: field })),
    ];
  });

  sheetOptions = computed(() => this.sheets().map((sheet, index) => ({ label: sheet.name, value: index })));

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    this.errorMessage.set(null);
    if (file.size > MAX_FILE_BYTES) {
      this.errorMessage.set('clients.import.fileTooLarge');
      return;
    }
    this.reading.set(true);
    try {
      const sheets = (await readSpreadsheet(file)).filter(sheet => headerRowIndex(sheet.rows) >= 0);
      if (sheets.length === 0) {
        this.errorMessage.set('clients.import.emptyFile');
        return;
      }
      this.fileName.set(file.name);
      this.sheets.set(sheets);
      this.pickSheet(0);
      this.step.set('columns');
    } catch (err) {
      console.error('client-import :', err);
      this.errorMessage.set('clients.import.readError');
    } finally {
      this.reading.set(false);
    }
  }

  pickSheet(index: number): void {
    this.sheetIndex.set(index);
    this.mapping.set(guessMapping(this.columns().map(column => column.title)));
  }

  // A field feeds one column at most: picking it for this one takes it off
  // whichever column had it.
  setField(column: number, field: ImportField | null): void {
    this.mapping.update(mapping => mapping.map((current, index) => {
      if (index === column) {
        return field;
      }
      return field !== null && current === field ? null : current;
    }));
  }

  // A file read, its columns matched or its rows previewed: leaving asks first
  // (unsavedChangesGuard, in app.routes.ts) - until the import is done.
  readonly leave = new LeaveConfirmation();

  confirmLeave(): Promise<boolean> {
    return this.leave.ask('clients.import.leaveLosesWork');
  }

  hasUnsavedChanges(): boolean {
    return this.step() !== 'file' && !this.done;
  }

  // A reload or a closed tab - the browser asks with its own message.
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
    }
  }

  // Back to the columns from the preview: its corrections and left-out rows
  // are rebuilt from the file once back - asked first when there are some.
  async backToColumns(previewEdited: boolean): Promise<void> {
    if (previewEdited && !(await this.leave.ask('clients.import.backLosesEdits'))) {
      return;
    }
    this.step.set('columns');
  }

  onImported(count: number): void {
    this.done = true;
    this.notifications.success('clients.import.done', { count });
    this.router.navigate(['/clients']);
  }

  changeFile(): void {
    this.sheets.set([]);
    this.fileName.set(null);
    this.mapping.set([]);
    this.step.set('file');
  }
}

// A, B, ... Z, AA, AB... - how a spreadsheet names its columns.
const columnLetter = (index: number): string => {
  let letter = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  }
  return letter;
};
