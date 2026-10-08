import { Component, inject, signal } from '@angular/core';
import { Drawer } from 'primeng/drawer';
import { AuthService } from '../../features/auth/auth.service';

// A dismissible bottom drawer telling the demo company's admin they're on a
// demo - shown again on every fresh login/reload (not persisted), closed via
// the drawer's own close icon until then.
@Component({
  selector: 'app-demo-banner',
  standalone: true,
  imports: [Drawer],
  templateUrl: './demo-banner.html',
})
export class DemoBanner {

  private auth = inject(AuthService);

  isDemoCompany = this.auth.isDemoCompany;

  visible = signal(true);
}
