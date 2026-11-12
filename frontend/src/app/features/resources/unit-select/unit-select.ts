import { Component, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { UnitListStore } from '../unit-list.store';
import { NotificationService } from '../../../shared/services/notification.service';

// A unit, picked from the company's own unit list - a resource's (form and
// list) and a document line's alike: the "+" footer adds a unit to the list
// (get-or-create), the cross takes one off it (a resource or line already
// using it keeps it, it's free text there). Works with both formControlName
// and ngModel. The current value is always an option, even one no longer on
// the list, so it never shows blank. Needs a UnitListStore provided by the
// page around it.
@Component({
  selector: 'app-unit-select',
  standalone: true,
  imports: [FormsModule, Select, InputText, Button, TranslocoPipe],
  templateUrl: './unit-select.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UnitSelect), multi: true }],
})
export class UnitSelect implements ControlValueAccessor {

  private notifications = inject(NotificationService);
  private store = inject(UnitListStore);

  inputId = input<string | undefined>(undefined);
  invalid = input(false);
  size = input<'small' | 'large' | undefined>(undefined);
  placeholder = input<string | undefined>(undefined);

  value = signal<string | null>(null);
  disabled = signal(false);

  options = computed(() => {
    const unitIds = new Map(this.store.units().map(unit => [unit.label, unit.id]));
    const labels = new Set(unitIds.keys());
    const current = this.value();
    if (current) {
      labels.add(current);
    }
    return Array.from(labels)
      .sort((a, b) => a.localeCompare(b))
      .map(label => ({ label, value: label, unitId: unitIds.get(label) ?? null }));
  });

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value || null);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  select(value: string | null): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  addUnit(label: string): void {
    const trimmed = label.trim();
    if (!trimmed) {
      return;
    }
    this.store.add(trimmed).subscribe({
      next: unit => this.select(unit.label),
      error: err => this.notifications.error('unit-select', err)
    });
  }

  // stopPropagation: the click must not also pick the option it sits on.
  archiveUnit(unitId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.store.archive(unitId).subscribe({
      error: err => this.notifications.error('unit-select', err)
    });
  }
}
