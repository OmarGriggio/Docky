import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, tap } from 'rxjs';
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

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  private setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

}
