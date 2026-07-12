import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap, tap } from 'rxjs';
import { AuthResponse, LoginPayload, RegisterPayload, UserRole } from '../../shared/models/auth';
import { Entreprise } from '../../shared/models/entreprise';
import { User } from '../../shared/models/user';

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
    this.currentUser()?.role === 'UTILISATEUR'
  );

  getToken(): string | null {
    return this.token();
  }

  login(payload: LoginPayload) {
    return this.http.post<AuthResponse>('http://localhost:3000/auth/login', {
      email: payload.email,
      passwordHash: payload.password,
    }).pipe(
      tap(response => this.setToken(response.token))
    );
  }

  register(payload: RegisterPayload) {
    const entreprise: Omit<Entreprise, 'id'> = {
      nom: payload.companyName,
      email: null,
      telephone: null,
      rue: null,
      npa: null,
      ville: null,
      pays: null,
      logo: null,
    };

    return this.http.post<Entreprise>('http://localhost:3000/entreprise', entreprise).pipe(
      switchMap(createdEntreprise =>
        this.http.post<User>('http://localhost:3000/user', {
          id_entreprise: createdEntreprise.id,
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
