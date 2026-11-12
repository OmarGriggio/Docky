import { Component, OnInit, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AutoComplete } from 'primeng/autocomplete';
import { PostalCodeService } from '../../services/postal-code.service';
import { PostalCode, searchPostalCodes } from '../../utils/postal-code-search';

// One field for an address's NPA and town together ("1950 Sion"): typing an
// NPA or a town suggests "NPA Town" from the official directory, picking one
// fills the field. Anything can still be typed (a place missing from it) -
// splitPostalCodeCity (postal-code-search.ts) turns the text back into an NPA
// and a town. The value is always that plain text, with formControlName or
// ngModel alike.
@Component({
  selector: 'app-postal-code-city',
  standalone: true,
  imports: [FormsModule, AutoComplete],
  template: `
    <p-autocomplete
      [inputId]="inputId()"
      [ngModel]="value()"
      (ngModelChange)="onTyped($event)"
      [suggestions]="suggestions()"
      (completeMethod)="search($event.query)"
      (onSelect)="pick($event.value)"
      optionLabel="label"
      [delay]="0"
      [size]="size()"
      [invalid]="invalid()"
      [disabled]="disabled()"
      [fluid]="true"
      appendTo="body"
    />
  `,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PostalCodeCity), multi: true }],
})
export class PostalCodeCity implements ControlValueAccessor, OnInit {

  private postalCodeService = inject(PostalCodeService);

  inputId = input<string | undefined>(undefined);
  invalid = input(false);
  size = input<'small' | 'large' | undefined>(undefined);

  value = signal('');
  disabled = signal(false);
  suggestions = signal<(PostalCode & { label: string })[]>([]);

  // Loaded once per session (see PostalCodeService) - until then, or if it
  // fails, the field is just typed.
  private codes: PostalCode[] = [];

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.postalCodeService.codes$.subscribe({
      next: codes => this.codes = codes,
      error: err => console.error('postal-code-city : ', err),
    });
  }

  search(query: string): void {
    this.suggestions.set(searchPostalCodes(this.codes, query).map(code => ({ ...code, label: `${code.npa} ${code.town}` })));
  }

  // Typed text arrives as a string; a picked suggestion as its object,
  // handled by pick() instead.
  onTyped(value: unknown): void {
    if (typeof value === 'string') {
      this.update(value);
    }
  }

  pick(code: PostalCode): void {
    this.update(`${code.npa} ${code.town}`);
  }

  private update(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
