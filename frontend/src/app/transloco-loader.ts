import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Translation, TranslocoLoader } from '@jsverse/transloco';

// Translation files live in public/i18n (served at /i18n/<lang>.json, same
// static-asset path in dev and prod - see angular.json's assets glob).
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {

  private http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`/i18n/${lang}.json`);
  }
}
