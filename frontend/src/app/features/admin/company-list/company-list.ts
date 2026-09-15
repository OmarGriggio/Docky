import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { Button } from 'primeng/button';
import { CompanyService } from '../../profile/company.service';
import { AuthService } from '../../auth/auth.service';
import { Company } from '../../../shared/models/company';

// PLATFORM_ADMIN only (see app.routes.ts's own roleGuard on this route) -
// picking a company here is the "impersonation" entry point: it swaps the
// active token for one scoped to that company (see AuthService's own
// impersonateCompany), then every other page in the app behaves exactly as
// it would for that company's own ADMIN.
@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [TableModule, Button],
  templateUrl: './company-list.html'
})
export class CompanyListComponent implements OnInit {

  private companyService = inject(CompanyService);
  private authService = inject(AuthService);
  private router = inject(Router);

  companies = signal<Company[]>([]);

  ngOnInit(): void {
    this.companyService.getCompanies().subscribe({
      next: data => this.companies.set(data),
      error: err => console.error('company-list : ' + err)
    });
  }

  impersonate(company: Company): void {
    this.authService.impersonateCompany(company.id).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: err => console.error('company-list : ' + err)
    });
  }

}
