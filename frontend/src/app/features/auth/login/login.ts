import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../auth.service';
import { LoginPayload } from '../../../shared/models/auth';

// The demo company's own admin - public on purpose (README's Live demo), so a
// visitor can look around with one click instead of copying credentials.
const DEMO_LOGIN: LoginPayload = { email: 'admin@demo.docky.ch', password: 'Demo2026!' };

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, InputText, FloatLabel, Button, Card, TranslocoPipe],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private transloco = inject(TranslocoService);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  errorMessage = signal<string | null>(null);
  loading = signal(false);

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.logIn(this.form.getRawValue());
  }

  tryDemo(): void {
    this.logIn(DEMO_LOGIN);
  }

  private logIn(payload: LoginPayload): void {
    this.errorMessage.set(null);
    this.loading.set(true);

    this.authService.login(payload).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: err => {
        console.error('login : ' + err);
        this.loading.set(false);
        this.errorMessage.set(this.transloco.translate('auth.login.error'));
      }
    });
  }

}
