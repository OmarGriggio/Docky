import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthResponse, LoginPayload, RegisterPayload, UserRole } from '../../shared/models/auth';
import { Company } from '../../shared/models/company';
import { User } from '../../shared/models/user';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;
const TOKEN_KEY = 'docky_token';
// Only ever set while a PLATFORM_ADMIN is impersonating a company - their
// own real token, parked here so "return to platform view" doesn't need a
// backend round-trip. See impersonateCompany()/returnToPlatformView() below
// and zz_docs/Decisions.md's "Cross-company access" entry.
const PLATFORM_TOKEN_KEY = 'docky_platform_token';

interface TokenPayload {
  userId: number;
  email: string;
  role: UserRole;
  company_id: number;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private platformToken = signal<string | null>(localStorage.getItem(PLATFORM_TOKEN_KEY));

  // Several API calls can 401 around the same moment (e.g. a page firing off
  // several list requests at once) - they all await this same in-flight
  // request instead of each triggering their own /auth/refresh call.
  private refreshInProgress: Observable<string> | null = null;

  isAuthenticated = computed(() => this.token() !== null);
  currentUser = computed(() => {
    const token = this.token();
    return token ? decodeToken(token) : null;
  });

  isAdmin = computed(() =>
    this.currentUser()?.role === 'ADMIN'
  );

  isUser = computed(() =>
    this.currentUser()?.role === 'USER'
  );

  isPlatformAdmin = computed(() =>
    this.currentUser()?.role === 'PLATFORM_ADMIN'
  );

  isImpersonating = computed(() => this.platformToken() !== null);

  getToken(): string | null {
    return this.token();
  }

  login(payload: LoginPayload) {
    // withCredentials so the browser stores the httpOnly refresh-token cookie
    // the backend sets on this response - the refresh token itself never
    // appears in the JSON body or touches frontend JS.
    return this.http.post<AuthResponse>(`${API_BASE}/auth/login`, {
      email: payload.email,
      passwordHash: payload.password,
    }, { withCredentials: true }).pipe(
      tap(response => this.setToken(response.token))
    );
  }

  register(payload: RegisterPayload) {
    const company: Omit<Company, 'id'> = {
      name: payload.companyName,
      email: null,
      phone: null,
      iban: null,
      street: null,
      postal_code: null,
      city: null,
      country: null,
      logo: null,
      header_image: null,
      vat_rate: 8.1,
      vat_number: null,
    };

    return this.http.post<Company>(`${API_BASE}/company`, company).pipe(
      switchMap(createdCompany =>
        this.http.post<User>(`${API_BASE}/user`, {
          company_id: createdCompany.id,
          firstname: payload.firstname,
          lastname: payload.lastname,
          email: payload.email,
          passwordHash: payload.password,
        })
      )
    );
  }

  // Exchanges the refresh token for a new access token. The refresh token
  // itself lives only in the httpOnly cookie the browser sends automatically
  // (withCredentials) - there's no way (and no need) to check for it in JS
  // first, the backend 401s if it's missing/invalid/expired. It's never
  // re-issued here either way - it stays the same until it naturally expires
  // (7 days) or logout() revokes it, see backend/CLAUDE.md.
  refreshAccessToken(): Observable<string> {
    if (!this.refreshInProgress) {
      this.refreshInProgress = this.http.post<{ token: string }>(`${API_BASE}/auth/refresh`, {}, { withCredentials: true }).pipe(
        tap(response => this.setToken(response.token)),
        map(response => response.token),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        }),
        finalize(() => this.refreshInProgress = null),
        shareReplay(1)
      );
    }

    return this.refreshInProgress;
  }

  logout(): void {
    // Best-effort: the token is cleared locally regardless of whether this
    // call reaches the backend or succeeds. withCredentials so the browser
    // sends the refresh-token cookie for the backend to revoke and clear.
    this.http.post(`${API_BASE}/auth/logout`, {}, { withCredentials: true }).subscribe({ error: () => {} });

    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
    this.clearPlatformToken();
  }

  // PLATFORM_ADMIN only (the backend route itself enforces this - see
  // auth.routes.ts). Swaps the active token for one carrying the target
  // company's own company_id, role unchanged - every existing endpoint's
  // own req.user.company_id scoping does the rest, nothing else needs to
  // know impersonation exists. The real platform token is parked in a
  // second slot on the FIRST switch only - switching company again while
  // already impersonating must not overwrite it with an impersonated one.
  impersonateCompany(companyId: number): Observable<void> {
    return this.http.post<{ token: string }>(`${API_BASE}/auth/impersonate/${companyId}`, {}).pipe(
      tap(response => {
        if (!this.platformToken()) {
          const current = this.token();
          if (current) {
            localStorage.setItem(PLATFORM_TOKEN_KEY, current);
            this.platformToken.set(current);
          }
        }
        this.setToken(response.token);
      }),
      map(() => undefined)
    );
  }

  // No backend call needed - the real token was never invalidated, just set
  // aside (see impersonateCompany() above).
  returnToPlatformView(): void {
    const platformToken = this.platformToken();
    if (!platformToken) {
      return;
    }
    this.setToken(platformToken);
    this.clearPlatformToken();
  }

  private clearPlatformToken(): void {
    localStorage.removeItem(PLATFORM_TOKEN_KEY);
    this.platformToken.set(null);
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

}
