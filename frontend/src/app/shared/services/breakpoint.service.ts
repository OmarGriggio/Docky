import { Injectable, signal } from '@angular/core';

// Same breakpoint as Tailwind's md, the only one the app uses: below it is a
// phone (the nav-bar turns into a bottom bar, lists turn into cards...), from
// it up a desktop. Anything that has to switch in TypeScript rather than with
// a `max-md:`/`md:` class reads `isMobile` here, never its own media query.
export const MOBILE_QUERY = '(max-width: 767.98px)';

@Injectable({ providedIn: 'root' })
export class BreakpointService {

  private readonly mobileQuery = window.matchMedia(MOBILE_QUERY);
  private readonly mobile = signal(this.mobileQuery.matches);

  // Follows a window resized (or a phone rotated) across the breakpoint, no
  // reload needed. A root service lives as long as the app, so the listener
  // is never removed.
  readonly isMobile = this.mobile.asReadonly();

  constructor() {
    this.mobileQuery.addEventListener('change', event => this.mobile.set(event.matches));
  }
}
