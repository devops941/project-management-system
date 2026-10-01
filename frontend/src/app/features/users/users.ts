import { ChangeDetectionStrategy, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from '../../core/services/user.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { Role } from '../../core/models/auth.model';
import { User, UserPayload } from '../../core/models/user.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { formatDate, initials, label } from '../../shared/utils/display';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.user ? 'Edit user' : 'New user' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline">
          <mat-label>Full name</mat-label>
          <input matInput formControlName="name" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ data.user ? 'New password (optional)' : 'Password' }}</mat-label>
          <input matInput type="password" formControlName="password" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Phone</mat-label>
          <input matInput formControlName="phone" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            @for (role of roles; track role) {
              <mat-option [value]="role">{{ label(role) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="toggle-row">
          <mat-slide-toggle formControlName="isActive">Active account</mat-slide-toggle>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ data.user ? 'Save changes' : 'Create user' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .dialog-content {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 16px;
        min-width: 520px;
      }
      .toggle-row {
        grid-column: span 2;
        padding: 8px 0;
      }
      @media (max-width: 600px) {
        .dialog-content {
          grid-template-columns: 1fr;
          min-width: auto;
        }
        .toggle-row {
          grid-column: span 1;
        }
      }
    `,
  ],
})
export class UserFormDialog {
  readonly roles: Role[] = ['ADMIN', 'MANAGER', 'MEMBER'];
  readonly label = label;
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    phone: [''],
    role: ['MEMBER' as Role, [Validators.required]],
    isActive: [true],
  });

  constructor(
    readonly dialogRef: MatDialogRef<UserFormDialog, (UserPayload & { id?: string }) | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: { user?: User },
  ) {
    if (data.user) {
      this.form.patchValue({
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone ?? '',
        role: data.user.role.name,
        isActive: data.user.isActive,
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name,
      email: raw.email,
      password: raw.password || undefined,
      phone: raw.phone || null,
      role: raw.role,
      isActive: raw.isActive,
    });
  }
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PageHeader,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Users" subtitle="Manage accounts, roles and access.">
      <button mat-flat-button color="primary" (click)="openForm()">
        <mat-icon>person_add</mat-icon>
        New user
      </button>
    </app-page-header>

    <mat-card class="card-surface filters" appearance="outlined">
      <mat-form-field appearance="outline" class="search">
        <mat-label>Search users</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [formControl]="searchControl" placeholder="Name or email" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Role</mat-label>
        <mat-select [formControl]="roleControl">
          <mat-option value="">All roles</mat-option>
          @for (role of roles; track role) {
            <mat-option [value]="role">{{ label(role) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-card>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (users().length) {
      <mat-card class="card-surface" appearance="outlined">
        <table mat-table [dataSource]="users()" class="pms-table">
          <ng-container matColumnDef="user">
            <th mat-header-cell *matHeaderCellDef>User</th>
            <td mat-cell *matCellDef="let user">
              <div class="user-cell">
                <span class="avatar">{{ initials(user.name) }}</span>
                <div class="user-info">
                  <strong>{{ user.name }}</strong>
                  <span class="text-muted">{{ user.email }}</span>
                </div>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="role">
            <th mat-header-cell *matHeaderCellDef>Role</th>
            <td mat-cell *matCellDef="let user">{{ label(user.role.name) }}</td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let user">
              <span class="chip" [class.chip-status-done]="user.isActive" [class.chip-critical]="!user.isActive">
                {{ user.isActive ? 'Active' : 'Disabled' }}
              </span>
            </td>
          </ng-container>
          <ng-container matColumnDef="workload">
            <th mat-header-cell *matHeaderCellDef>Assignments</th>
            <td mat-cell *matCellDef="let user">{{ user._count?.assignments ?? 0 }}</td>
          </ng-container>
          <ng-container matColumnDef="lastLogin">
            <th mat-header-cell *matHeaderCellDef>Last login</th>
            <td mat-cell *matCellDef="let user">{{ formatDate(user.lastLoginAt) }}</td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let user">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="openForm(user)">
                  <mat-icon>edit</mat-icon><span>Edit</span>
                </button>
                <button mat-menu-item (click)="toggleStatus(user)">
                  <mat-icon>{{ user.isActive ? 'block' : 'check_circle' }}</mat-icon>
                  <span>{{ user.isActive ? 'Disable' : 'Enable' }}</span>
                </button>
                <button mat-menu-item (click)="remove(user)">
                  <mat-icon>delete</mat-icon><span>Delete</span>
                </button>
              </mat-menu>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="columns"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 20, 50]"
          (page)="onPage($event)"
          showFirstLastButtons
        ></mat-paginator>
      </mat-card>
    } @else {
      <mat-card class="card-surface" appearance="outlined">
        <app-empty-state icon="group_off" title="No users found" message="Adjust filters or add a new user." />
      </mat-card>
    }
  `,
  styles: [
    `
      .filters {
        display: flex;
        gap: 16px;
        padding: 16px;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .filters .search {
        flex: 1 1 240px;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 64px 0;
      }
      .user-cell {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #4f46e5;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .user-info {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .user-info span {
        font-size: 0.78rem;
      }
    `,
  ],
})
export class Users implements OnInit {
  private readonly usersService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(NotificationToastService);
  private readonly fb = inject(FormBuilder);

  readonly roles: Role[] = ['ADMIN', 'MANAGER', 'MEMBER'];
  readonly columns = ['user', 'role', 'status', 'workload', 'lastLogin', 'actions'];
  readonly loading = signal(true);
  readonly users = signal<User[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(10);

  readonly searchControl = this.fb.nonNullable.control('');
  readonly roleControl = this.fb.nonNullable.control('');

  private page = 1;
  private searchTimer?: ReturnType<typeof setTimeout>;

  label = label;
  formatDate = formatDate;
  initials = initials;

  ngOnInit(): void {
    this.load();
    this.searchControl.valueChanges.subscribe(() => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.load();
      }, 300);
    });
    this.roleControl.valueChanges.subscribe(() => this.load());
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize.set(event.pageSize);
    this.load();
  }

  openForm(user?: User): void {
    const ref = this.dialog.open(UserFormDialog, { data: { user }, width: '620px' });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      const request = user ? this.usersService.update(user.id, payload) : this.usersService.create(payload);
      request.subscribe({
        next: () => {
          this.toast.success(user ? 'User updated' : 'User created');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  toggleStatus(user: User): void {
    this.usersService.toggleStatus(user.id).subscribe({
      next: () => {
        this.toast.success(`User ${user.isActive ? 'disabled' : 'enabled'}`);
        this.load();
      },
      error: (error) => this.toast.error(extractErrorMessage(error)),
    });
  }

  remove(user: User): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete user',
        message: `Delete ${user.name}? Their assignments and history will be removed.`,
        confirmText: 'Delete',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.usersService.remove(user.id).subscribe({
        next: () => {
          this.toast.success('User deleted');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.usersService
      .list({
        page: this.page,
        limit: this.pageSize(),
        search: this.searchControl.value || undefined,
        role: this.roleControl.value || undefined,
      })
      .subscribe({
        next: (res) => {
          this.users.set(res.data);
          this.total.set(res.meta.total);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(extractErrorMessage(error));
        },
      });
  }
}
