import { Component, OnInit, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Select } from 'primeng/select';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { ResourceUnitService } from '../resource-unit.service';
import { ResourceUnit } from '../../../shared/models/resource-unit';

// A resource's unit, picked from the company's own unit list - the same
// picker as a document line's (document-sections.html): the "+" footer adds
// a unit to the list (get-or-create), the cross takes one off it. Works with
// both formControlName and ngModel. The current value is always an option,
// even one no longer on the list, so it never shows blank.
@Component({
  selector: 'app-unit-select',
  standalone: true,
  imports: [FormsModule, Select, InputText, Button, TranslocoPipe],
  templateUrl: './unit-select.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UnitSelect), multi: true }],
})
export class UnitSelect implements ControlValueAccessor, OnInit {

  private resourceUnitService = inject(ResourceUnitService);

  inputId = input<string | undefined>(undefined);
  invalid = input(false);

  value = signal<string | null>(null);
  disabled = signal(false);
  private units = signal<ResourceUnit[]>([]);

  options = computed(() => {
    const unitIds = new Map(this.units().map(unit => [unit.label, unit.id]));
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

  ngOnInit(): void {
    this.resourceUnitService.getUnits().subscribe({
      next: data => this.units.set(data),
      error: err => console.error('unit-select : ' + err)
    });
  }

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
    this.resourceUnitService.createUnit(trimmed).subscribe({
      next: unit => {
        this.units.update(units => units.some(u => u.id === unit.id) ? units : [...units, unit]);
        this.select(unit.label);
      },
      error: err => console.error('unit-select : ' + err)
    });
  }

  // stopPropagation: the click must not also pick the option it sits on.
  archiveUnit(unitId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.resourceUnitService.archiveUnit(unitId).subscribe({
      next: () => this.units.update(units => units.filter(unit => unit.id !== unitId)),
      error: err => console.error('unit-select : ' + err)
    });
  }
}
