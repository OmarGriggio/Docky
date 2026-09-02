import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { UserService } from '../user.service';
import { AuthService } from '../../auth/auth.service';
import { UserRole } from '../../../shared/models/auth';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, SelectButton, Button, Card],
  templateUrl: './user-form.html',
  styleUrl: './user-form.css',
})
export class UserForm implements OnInit {

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    firstname: ['', Validators.required],
    lastname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['USER' as UserRole, Validators.required],
  });

  roleOptions = [
    { label: 'Utilisateur', value: 'USER' },
    { label: 'Administrateur', value: 'ADMIN' },
  ];

  errorMessage = signal<string | null>(null);

  private companyId: number | null = null;

  ngOnInit(): void {
    this.userService.getUsers().subscribe({
      next: users => {
        const self = users.find(user => user.id === this.authService.currentUser()?.userId);
        this.companyId = self?.company_id ?? null;
      },
      error: err => {
        console.error("user-form : " + err);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }

  submit(): void {
    if (this.form.invalid || this.companyId === null) {
      return;
    }

    this.errorMessage.set(null);

    const { password, ...user } = this.form.getRawValue();

    this.userService.createUser({
      ...user,
      company_id: this.companyId,
      passwordHash: password,
    }).subscribe({
      next: () => {
        this.router.navigate(['/admin/users']);
      },
      error: err => {
        console.error('user-form : ' + err);
        this.errorMessage.set('Impossible de créer l\'utilisateur. Cet email est peut-être déjà utilisé.');
      }
    });
  }

}
