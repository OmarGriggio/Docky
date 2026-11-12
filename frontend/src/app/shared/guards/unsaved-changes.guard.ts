import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';

// A page holding work that isn't saved yet (the quote/invoice form) - leaving
// it asks first, instead of silently throwing that work away. The browser's
// own reload/close is caught by the page itself (a beforeunload listener).
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component =>
  !component.hasUnsavedChanges() || window.confirm(inject(TranslocoService).translate('common.unsavedChanges'));
