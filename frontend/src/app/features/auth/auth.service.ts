import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthResponse, LoginPayload, RegisterPayload, UserRole } from '../../shared/models/auth';
import { Company } from '../../shared/models/company';
import { User } from '../../shared/models/user';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;
const TOKEN_KEY = 'docky_token';

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
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

}
