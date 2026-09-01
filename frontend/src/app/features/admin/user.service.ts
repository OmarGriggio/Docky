import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateUserPayload, User } from '../../shared/models/user';
import { environment } from '../../../environments/environment';

const API_BASE = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private http = inject(HttpClient);

  getUsers() {
    return this.http.get<User[]>(`${API_BASE}/user`);
  }

  createUser(user: CreateUserPayload) {
    return this.http.post<User>(`${API_BASE}/user`, user);
  }

  deleteUser(id: number) {
    return this.http.delete<User>(`${API_BASE}/user/${id}`);
  }
}
