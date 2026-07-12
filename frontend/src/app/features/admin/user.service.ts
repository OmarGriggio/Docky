import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CreateUserPayload, User } from '../../shared/models/user';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private http = inject(HttpClient);

  getUsers() {
    return this.http.get<User[]>('http://localhost:3000/user');
  }

  createUser(user: CreateUserPayload) {
    return this.http.post<User>('http://localhost:3000/user', user);
  }

  deleteUser(id: number) {
    return this.http.delete<User>(`http://localhost:3000/user/${id}`);
  }
}
