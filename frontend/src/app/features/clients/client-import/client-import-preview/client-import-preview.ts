import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TableModule } from 'primeng/table';
import { InputText } from 'primeng/inputtext';
import { Checkbox } from 'primeng/checkbox';
import { Button } from 'primeng/button';
import { SelectButton } from 'primeng/selectbutton';
import { TranslocoPipe, TranslocoService, translateObjectSignal } from '@jsverse/transloco';
import { ClientService } from '../../client.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ClientImportRow, ImportField } from '../import-columns';
import { ImportIssue, ImportReport, ImportRowResult } from '../import-report';

// One row of the sheet in the preview: its values (editable here), whether
// it's left out, and the backend's verdict on it as last checked.
interface PreviewRow {
  line: number;
  values: ClientImportRow;
  excluded: boolean;
  result: ImportRowResult | null;
}

type Filter = 'all' | 'errors' | 'warnings' | 'excluded';

// The import's last step: every row as the backend judges it (a dry run of
// POST /client/import) - blocking errors in red, warnings in orange, on the
// cell they concern. A row can be fixed right here or left out; any change
// means checking again before importing. The import itself creates every
// row kept or none.
@Component({
  selector: 'app-client-import-preview',
  standalone: true,
  imports: [FormsModule, TableModule, InputText, Checkbox, Button, SelectButton, TranslocoPipe],
  templateUrl: './client-import-preview.html',
})
export class ClientImportPreview implements OnInit {

  private clientService = inject(ClientService);
  private notifications = inject(NotificationService);
  private transloco = inject(TranslocoService);

  lines = input.required<{ line: number; row: ClientImportRow }[]>();
  // The fields the columns were matched to, in the mapping screen's order.
  fields = input.required<ImportField[]>();
  back = output<void>();
  imported = output<number>();

  // Edited in place (a cell's value, excluded) and the array replaced - same
  // row objects, so the table keeps its inputs (and their focus) while typing.
  rows = signal<PreviewRow[]>([]);
  checking = signal(false);
  importing = signal(false);
  // Something changed since the last check - the verdicts shown may be stale.
  stale = signal(false);
  filter = signal<Filter>('all');
  // An import refused because rows had errors after all (see importRows).
  failed = signal(false);

  private included = computed(() => this.rows().filter(row => !row.excluded));
  errorCount = computed(() => this.included().filter(row => row.result?.errors.length).length);
  warningCount = computed(() => this.included().filter(row => row.result?.warnings.length).length);
  excludedCount = computed(() => this.rows().filter(row => row.excluded).length);
  includedCount = computed(() => this.included().length);

  visibleRows = computed(() => {
    switch (this.filter()) {
      case 'errors': return this.rows().filter(row => !row.excluded && row.result?.errors.length);
      case 'warnings': return this.rows().filter(row => !row.excluded && row.result?.warnings.length);
      case 'excluded': return this.rows().filter(row => row.excluded);
      default: return this.rows();
    }
  });

  canImport = computed(() =>
    !this.stale() && !this.checking() && !this.importing() && this.includedCount() > 0 && this.errorCount() === 0
  );

  private fieldLabels = translateObjectSignal('clients.import.fields');
  private filterLabels = translateObjectSignal('clients.import.filters');

  filterOptions = computed(() => {
    const labels = this.filterLabels() as Record<string, string>;
    return [
      { label: labels['all'], value: 'all' },
      { label: `${labels['errors']} (${this.errorCount()})`, value: 'errors' },
      { label: `${labels['warnings']} (${this.warningCount()})`, value: 'warnings' },
      { label: `${labels['excluded']} (${this.excludedCount()})`, value: 'excluded' },
    ];
  });

  ngOnInit(): void {
    this.rows.set(this.lines().map(({ line, row }) => ({ line, values: { ...row }, excluded: false, result: null })));
    this.check();
  }

  fieldLabel(field: ImportField): string {
    return (this.fieldLabels() as Record<string, string>)[field] ?? field;
  }

  issueText(issue: ImportIssue): string {
    return this.transloco.translate(`clients.import.issues.${issue.code}`, { ...issue.params, field: this.fieldLabel(issue.field) });
  }

  // How a cell is outlined: red for an error on its field, orange for a warning.
  cellState(row: PreviewRow, field: ImportField): 'error' | 'warning' | null {
    if (row.excluded || !row.result) {
      return null;
    }
    if (row.result.errors.some(issue => issue.field === field)) {
      return 'error';
    }
    return row.result.warnings.some(issue => issue.field === field) ? 'warning' : null;
  }

  edit(row: PreviewRow, field: ImportField, value: string): void {
    row.values[field] = value;
    // A number typed here must be one (backend resolveNumber).
    if (field === 'client_number') {
      row.values.client_number_edited = true;
    }
    this.touch();
  }

  toggleExcluded(row: PreviewRow, excluded: boolean): void {
    row.excluded = excluded;
    this.touch();
  }

  excludeErrors(): void {
    for (const row of this.included()) {
      if (row.result?.errors.length) {
        row.excluded = true;
      }
    }
    this.touch();
    this.check();
  }

  private touch(): void {
    this.stale.set(true);
    this.failed.set(false);
    this.rows.update(rows => [...rows]);
  }

  // The rows kept, as the backend takes them, and where each one's verdict goes.
  private payload(): { kept: PreviewRow[]; rows: ClientImportRow[]; country: string; language: string } {
    const kept = this.included();
    return {
      kept,
      rows: kept.map(row => row.values),
      country: this.transloco.translate('clients.form.defaultCountry'),
      language: this.transloco.getActiveLang().toUpperCase(),
    };
  }

  private applyReport(kept: PreviewRow[], report: ImportReport): void {
    kept.forEach((row, index) => row.result = report.rows[index] ?? null);
    this.stale.set(false);
    this.rows.update(rows => [...rows]);
  }

  async check(): Promise<void> {
    const { kept, rows, country, language } = this.payload();
    if (kept.length === 0) {
      this.stale.set(false);
      return;
    }
    this.checking.set(true);
    try {
      this.applyReport(kept, await firstValueFrom(this.clientService.importClients(rows, country, language, true)));
    } catch (err) {
      this.notifications.error('client-import-preview', err);
    } finally {
      this.checking.set(false);
    }
  }

  // The backend checks again before writing: a row turned wrong meanwhile (a
  // client created with that number since) comes back as a 422 with its
  // verdicts, and nothing is created.
  async importRows(): Promise<void> {
    const { kept, rows, country, language } = this.payload();
    this.importing.set(true);
    try {
      const report = await firstValueFrom(this.clientService.importClients(rows, country, language, false));
      this.imported.emit(report.created);
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 422 && err.error?.rows) {
        this.applyReport(kept, err.error as ImportReport);
        this.failed.set(true);
        this.filter.set('errors');
      } else {
        this.notifications.error('client-import-preview', err);
      }
    } finally {
      this.importing.set(false);
    }
  }
}
