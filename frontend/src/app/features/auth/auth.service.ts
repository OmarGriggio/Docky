import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthResponse, LoginPayload, RegisterPayload, UserRole } from '../../shared/models/auth';
import { Company } from '../../shared/models/company';
import { User } from '../../shared/models/user';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;
const TOKEN_KEY = 'docky_token';
const REFRESH_TOKEN_KEY = 'docky_refresh_token';

interface TokenPayload {
  userId: number;
  email: string;
  role: UserRole;
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
  private refreshToken = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));

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
    return this.http.post<AuthResponse>(`${API_BASE}/auth/login`, {
      email: payload.email,
      passwordHash: payload.password,
    }).pipe(
      tap(response => this.setTokens(response.token, response.refreshToken))
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

  // Exchanges the stored refresh token for a new access token. The refresh
  // token itself is never re-issued here - it stays the same until it
  // naturally expires (7 days) or logout() revokes it, see backend/CLAUDE.md.
  refreshAccessToken(): Observable<string> {
    const refreshToken = this.refreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    if (!this.refreshInProgress) {
      this.refreshInProgress = this.http.post<{ token: string }>(`${API_BASE}/auth/refresh`, { refreshToken }).pipe(
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
    const refreshToken = this.refreshToken();
    if (refreshToken) {
      // Best-effort: the tokens are cleared locally regardless of whether
      // this call reaches the backend or succeeds.
      this.http.post(`${API_BASE}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.token.set(null);
    this.refreshToken.set(null);
  }

  private setTokens(token: string, refreshToken: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    this.token.set(token);
    this.refreshToken.set(refreshToken);
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

}
