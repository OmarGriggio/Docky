import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Company } from '../../models/company';
import { missingForInvoicing } from '../../utils/invoicing-readiness';
import { AuthService } from '../../../features/auth/auth.service';

// "Complète ton profil pour pouvoir facturer" - shown (dashboard, profile)
// while the company's profile lacks what an invoice's QR-bill needs, so it's
// found out here rather than when an invoice's PDF fails. Only someone who
// can edit the profile gets the link; an employee is told who can.
@Component({
  selector: 'app-invoicing-readiness-banner',
  standalone: true,
  imports: [RouterLink, TranslocoPipe],
  template: `
    @if (missing().length > 0) {
      <div class="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <i class="pi pi-exclamation-triangle mt-0.5"></i>
        <div class="flex flex-col gap-1">
          <span class="font-medium">{{ 'invoicingReadiness.title' | transloco }}</span>
          <span>
            {{ 'invoicingReadiness.missing' | transloco }}
            @for (field of missing(); track field; let last = $last) {
              {{ 'invoicingReadiness.fields.' + field | transloco }}@if (!last) {, }
            }
          </span>
          @if (showLink()) {
            @if (canEdit()) {
              <a routerLink="/profile" class="font-medium text-amber-900 underline">{{ 'invoicingReadiness.complete' | transloco }}</a>
            } @else {
              <span>{{ 'invoicingReadiness.askAdmin' | transloco }}</span>
            }
          }
        </div>
      </div>
    }
  `,
})
export class InvoicingReadinessBanner {

  private authService = inject(AuthService);

  company = input<Company | null>(null);
  // Off on the profile page itself - it is where to complete it.
  showLink = input(true);

  missing = computed(() => {
    const company = this.company();
    return company ? missingForInvoicing(company) : [];
  });
  canEdit = computed(() => this.authService.isAdmin() || this.authService.isPlatformAdmin());
}
