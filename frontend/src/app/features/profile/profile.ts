import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusChip } from '../../shared/components/status-chip/status-chip';
import { formatDate, initials, label } from '../../shared/utils/display';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PageHeader,
    StatusChip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="My profile" subtitle="Your account details and security settings." />

    @if (user(); as current) {
      <section class="profile-grid">
        <mat-card class="card-surface identity" appearance="outlined">
          <div class="identity-avatar">{{ initials(current.name) }}</div>
          <h2>{{ current.name }}</h2>
          <p class="text-muted">{{ current.email }}</p>
          <app-status-chip [value]="current.role" kind="neutral"></app-status-chip>
          <div class="identity-meta">
            <div>
              <span class="meta-label">Phone</span>
              <strong>{{ current.phone || '-' }}</strong>
            </div>
            <div>
              <span class="meta-label">Last login</span>
              <strong>{{ formatDate(current.lastLoginAt) }}</strong>
            </div>
          </div>
        </mat-card>

        <mat-card class="card-surface" appearance="outlined">
          <mat-card-header>
            <mat-icon class="header-icon">lock</mat-icon>
            <mat-card-title>Change password</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="password-form">
              <mat-form-field appearance="outline">
                <mat-label>Current password</mat-label>
                <input matInput type="password" formControlName="currentPassword" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>New password</mat-label>
                <input matInput type="password" formControlName="newPassword" />
                <mat-hint>At least 8 characters</mat-hint>
                @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid) {
                  <mat-error>Password must be at least 8 characters</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Confirm new password</mat-label>
                <input matInput type="password" formControlName="confirmPassword" />
              </mat-form-field>
              @if (mismatch()) {
                <p class="mismatch">Passwords do not match.</p>
              }
              <button
                mat-flat-button
                color="primary"
                type="submit"
                [disabled]="passwordForm.invalid || mismatch() || saving()"
              >
                Update password
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </section>
    } @else {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    }
  `,
  styles: [
    `
      .profile-grid {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 16px;
        align-items: start;
      }
      .identity {
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 8px;
      }
      .identity-avatar {
        width: 84px;
        height: 84px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 1.6rem;
        font-weight: 700;
      }
      .identity h2 {
        margin: 8px 0 0;
      }
      .identity p {
        margin: 0;
      }
      .identity-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        width: 100%;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #f1f5f9;
      }
      .identity-meta div {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .meta-label {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #94a3b8;
      }
      .header-icon {
        margin-right: 8px;
        color: #4f46e5;
      }
      .password-form {
        display: flex;
        flex-direction: column;
        max-width: 420px;
        gap: 4px;
      }
      .mismatch {
        color: #dc2626;
        font-size: 0.82rem;
        margin: 0 0 8px;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 64px 0;
      }
      @media (max-width: 900px) {
        .profile-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Profile implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(NotificationToastService);
  private readonly fb = inject(FormBuilder);

  readonly user = toSignal(this.auth.user$, { initialValue: this.auth.currentUser });
  readonly saving = signal(false);
  readonly mismatch = signal(false);

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  formatDate = formatDate;
  initials = initials;
  label = label;

  ngOnInit(): void {
    this.auth.refreshProfile().subscribe({ error: () => undefined });
    this.passwordForm.valueChanges.subscribe(() => {
      const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
      this.mismatch.set(!!confirmPassword && newPassword !== confirmPassword);
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.mismatch()) return;
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.saving.set(true);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Password updated');
        this.passwordForm.reset();
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }
}
