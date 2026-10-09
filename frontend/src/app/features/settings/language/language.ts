import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectButton } from 'primeng/selectbutton';
import { Card } from 'primeng/card';
import { TranslocoPipe, TranslocoService, translateSignal } from '@jsverse/transloco';
import { AuthService, Language as LanguageCode } from '../../auth/auth.service';

@Component({
  selector: 'app-language',
  standalone: true,
  imports: [FormsModule, SelectButton, Card, TranslocoPipe],
  templateUrl: './language.html',
})
export class Language {

  private authService = inject(AuthService);
  private transloco = inject(TranslocoService);

  // SelectButton renders option labels as plain text too - translateSignal(),
  // not a one-off translate() call, see settings.ts's own comment for why.
  private frenchLabel = translateSignal('settings.french');
  private englishLabel = translateSignal('settings.english');

  options = computed(() => [
    { label: this.frenchLabel(), value: 'FR' as LanguageCode },
    { label: this.englishLabel(), value: 'EN' as LanguageCode },
  ]);

  language = signal<LanguageCode>(this.authService.currentUser()?.language ?? 'FR');

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  setLanguage(language: LanguageCode): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const previous = this.language();
    this.language.set(language);

    this.authService.updateLanguage(language).subscribe({
      next: () => this.successMessage.set(this.transloco.translate('settings.languageUpdated')),
      error: err => {
        console.error('settings/language : ' + err);
        this.language.set(previous);
        this.errorMessage.set(this.transloco.translate('settings.languageUpdateError'));
      }
    });
  }

}
