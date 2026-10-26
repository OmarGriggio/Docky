import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideTransloco } from '@jsverse/transloco';
import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './features/auth/auth.interceptor';
import { provideServiceWorker } from '@angular/service-worker';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.dark',
        },
      },
    }),
    // defaultLang is FR - the app's own convention (see CLAUDE.md's "UI text
    // stays French"). AuthService sets the active lang from the logged-in
    // user's own `language` (see auth.service.ts) once they're authenticated.
    provideTransloco({
      config: {
        availableLangs: ['fr', 'en'],
        defaultLang: 'fr',
        fallbackLang: 'fr',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
    // Makes Docky installable on a phone's home screen and caches the app
    // shell (JS/CSS/translations, see ngsw-config.json) - never API data:
    // /api/** always goes to the network. Prod builds only, `ng serve` stays
    // as before.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ]
};