import { signal } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

// A page holding work that isn't saved yet (the quote/invoice form, the client
// import) - leaving it asks first, in the app's own confirm dialog
// (confirmLeave, see LeaveConfirmation), instead of silently throwing that work
// away. The browser's own reload/close is caught by the page itself (a
// beforeunload listener) - browsers only ever show their own message there.
export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  confirmLeave(): Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = component =>
  !component.hasUnsavedChanges() || component.confirmLeave();

// The page's side of it: an <app-confirm-dialog> bound to `visible`/`message`,
// its confirmed/cancelled outputs to answer() - ask() resolves once answered.
export class LeaveConfirmation {
  readonly visible = signal(false);
  // A translation key - the default "unsaved changes" one unless said otherwise.
  readonly message = signal('common.unsavedChanges');
  private resolve: ((leave: boolean) => void) | null = null;

  ask(message = 'common.unsavedChanges'): Promise<boolean> {
    this.message.set(message);
    this.visible.set(true);
    return new Promise(resolve => this.resolve = resolve);
  }

  answer(leave: boolean): void {
    this.visible.set(false);
    this.resolve?.(leave);
    this.resolve = null;
  }
}
