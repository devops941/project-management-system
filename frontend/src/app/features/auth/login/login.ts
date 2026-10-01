import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationToastService } from '../../../core/services/toast.service';
import { extractErrorMessage } from '../../../core/interceptors/auth.interceptor';

interface DemoAccount {
  role: string;
  email: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-page">
      <section class="login-hero">
        <div class="hero-brand">
          <div class="hero-logo">PMS</div>
          <h1>Project Management System</h1>
        </div>
        <p class="hero-tagline">
          Plan projects, coordinate teams and keep every deadline in view from one workspace.
        </p>
        <ul class="hero-features">
          <li><mat-icon>folder_managed</mat-icon> Projects &amp; teams</li>
          <li><mat-icon>view_kanban</mat-icon> Kanban task board</li>
          <li><mat-icon>insights</mat-icon> Reports &amp; exports</li>
          <li><mat-icon>notifications_active</mat-icon> Deadline alerts</li>
        </ul>
      </section>

      <section class="login-panel">
        <mat-card class="login-card" appearance="outlined">
          @if (loading()) {
            <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          }
          <mat-card-header>
            <mat-card-title>Sign in</mat-card-title>
            <mat-card-subtitle>Use your work account to continue</mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" autocomplete="username" />
                <mat-icon matPrefix>mail</mat-icon>
                @if (form.controls.email.touched && form.controls.email.invalid) {
                  <mat-error>Enter a valid email address</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>Password</mat-label>
                <input
                  matInput
                  [type]="hidePassword() ? 'password' : 'text'"
                  formControlName="password"
                  autocomplete="current-password"
                />
                <mat-icon matPrefix>lock</mat-icon>
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  (click)="hidePassword.set(!hidePassword())"
                  [attr.aria-label]="'Toggle password visibility'"
                >
                  <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                @if (form.controls.password.touched && form.controls.password.invalid) {
                  <mat-error>Password is required</mat-error>
                }
              </mat-form-field>

              <button
                mat-flat-button
                color="primary"
                type="submit"
                class="submit-btn"
                [disabled]="form.invalid || loading()"
              >
                Sign in
              </button>
            </form>
          </mat-card-content>

          <mat-card-footer class="demo-accounts">
            <span class="text-muted">Demo accounts (password <code>Password&#64;123</code>)</span>
            <div class="demo-buttons">
              @for (account of demoAccounts; track account.email) {
                <button mat-stroked-button type="button" (click)="useDemo(account)">
                  {{ account.role }}
                </button>
              }
            </div>
          </mat-card-footer>
        </mat-card>
      </section>
    </div>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1.1fr 1fr;
      }
      .login-hero {
        background: linear-gradient(150deg, #312e81 0%, #4f46e5 55%, #7c3aed 100%);
        color: #fff;
        padding: 64px 56px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 24px;
      }
      .hero-brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .hero-logo {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.18);
        display: grid;
        place-items: center;
        font-weight: 700;
      }
      .hero-brand h1 {
        font-size: 1.9rem;
        margin: 0;
        font-weight: 700;
      }
      .hero-tagline {
        font-size: 1.05rem;
        max-width: 420px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.6;
      }
      .hero-features {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .hero-features li {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 0.92rem;
      }
      .login-panel {
        display: grid;
        place-items: center;
        padding: 32px;
        background: #f8fafc;
      }
      .login-card {
        width: 100%;
        max-width: 420px;
        border-radius: 16px;
        padding-bottom: 8px;
      }
      .full {
        width: 100%;
      }
      .submit-btn {
        width: 100%;
        height: 46px;
        font-size: 1rem;
        margin-top: 4px;
      }
      .demo-accounts {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        font-size: 0.8rem;
      }
      .demo-buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .demo-buttons button {
        flex: 1 1 auto;
      }
      @media (max-width: 900px) {
        .login-page {
          grid-template-columns: 1fr;
        }
        .login-hero {
          display: none;
        }
      }
    `,
  ],
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(NotificationToastService);

  readonly loading = signal(false);
  readonly hidePassword = signal(true);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  readonly demoAccounts: DemoAccount[] = [
    { role: 'Admin', email: 'admin@pms.local' },
    { role: 'Manager', email: 'manager@pms.local' },
    { role: 'Member', email: 'alice@pms.local' },
  ];

  useDemo(account: DemoAccount): void {
    this.form.setValue({ email: account.email, password: 'Password@123' });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Welcome back!');
        const redirect = this.route.snapshot.queryParamMap.get('redirect') || '/dashboard';
        this.router.navigateByUrl(redirect);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }
}
