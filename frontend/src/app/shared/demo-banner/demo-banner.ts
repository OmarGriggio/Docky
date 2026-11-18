import { Component, effect, inject, signal } from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '../../features/auth/auth.service';

const DISMISSED_KEY = 'docky_demo_banner_dismissed';

// A dismissible bottom drawer telling the demo company's admin they're on a
// demo. Closed, it stays closed for the rest of the visit - reloads included
// (sessionStorage) - and comes back on a later visit, in a new tab or once
// the browser is reopened.
@Component({
  selector: 'app-demo-banner',
  standalone: true,
  imports: [Drawer, TranslocoPipe],
  templateUrl: './demo-banner.html',
})
export class DemoBanner {

  private auth = inject(AuthService);

  isDemoCompany = this.auth.isDemoCompany;

  visible = signal(!this.wasDismissed());

  constructor() {
    effect(() => {
      if (!this.visible()) {
        try {
          sessionStorage.setItem(DISMISSED_KEY, 'true');
        } catch {
          // No storage (a private window): it just comes back on a reload.
        }
      }
    });
  }

  private wasDismissed(): boolean {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  }
}
