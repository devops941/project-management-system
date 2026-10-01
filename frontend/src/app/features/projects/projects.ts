import { ChangeDetectionStrategy, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusChip } from '../../shared/components/status-chip/status-chip';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { Project, ProjectPayload, Priority, ProjectStatus } from '../../core/models/project.model';
import { PRIORITIES, PROJECT_STATUSES, formatDate } from '../../shared/utils/display';

@Component({
  selector: 'app-project-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.project ? 'Edit project' : 'New project' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline">
          <mat-label>Project name</mat-label>
          <input matInput formControlName="name" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Project code</mat-label>
          <input matInput formControlName="code" placeholder="e.g. MBA-2026" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Description</mat-label>
          <textarea matInput rows="3" formControlName="description"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Start date</mat-label>
          <input matInput type="date" formControlName="startDate" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>End date</mat-label>
          <input matInput type="date" formControlName="endDate" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select formControlName="priority">
            @for (p of priorities; track p) {
              <mat-option [value]="p">{{ p }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ s }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ data.project ? 'Save changes' : 'Create project' }}
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
      .span-2 {
        grid-column: span 2;
      }
      @media (max-width: 600px) {
        .dialog-content {
          grid-template-columns: 1fr;
          min-width: auto;
        }
        .span-2 {
          grid-column: span 1;
        }
      }
    `,
  ],
})
export class ProjectFormDialog {
  readonly priorities = PRIORITIES;
  readonly statuses = PROJECT_STATUSES;
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    code: [''],
    description: [''],
    startDate: [''],
    endDate: [''],
    priority: ['MEDIUM' as Priority, [Validators.required]],
    status: ['PLANNING' as ProjectStatus, [Validators.required]],
  });

  constructor(
    readonly dialogRef: MatDialogRef<ProjectFormDialog, ProjectPayload | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: { project?: Project },
  ) {
    if (data.project) {
      const p = data.project;
      this.form.patchValue({
        name: p.name,
        code: p.code ?? '',
        description: p.description ?? '',
        startDate: p.startDate ? p.startDate.slice(0, 10) : '',
        endDate: p.endDate ? p.endDate.slice(0, 10) : '',
        priority: p.priority,
        status: p.status,
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name,
      code: raw.code || undefined,
      description: raw.description || null,
      startDate: raw.startDate || null,
      endDate: raw.endDate || null,
      priority: raw.priority,
      status: raw.status,
    });
  }
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    PageHeader,
    StatusChip,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Projects" subtitle="Create, track and close out every initiative.">
      @if (canManage()) {
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>add</mat-icon>
          New project
        </button>
      }
    </app-page-header>

    <mat-card class="card-surface filters" appearance="outlined">
      <mat-form-field appearance="outline" class="search">
        <mat-label>Search projects</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [formControl]="searchControl" placeholder="Name or code" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [formControl]="statusControl">
          <mat-option value="">All</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ s }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Priority</mat-label>
        <mat-select [formControl]="priorityControl">
          <mat-option value="">All</mat-option>
          @for (p of priorities; track p) {
            <mat-option [value]="p">{{ p }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-card>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (projects().length) {
      <mat-card class="card-surface" appearance="outlined">
        <table mat-table [dataSource]="projects()" class="pms-table">
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Project</th>
            <td mat-cell *matCellDef="let project">
              <a class="project-link" [routerLink]="['/projects', project.id]">
                <strong>{{ project.name }}</strong>
                <span class="text-muted">{{ project.code }}</span>
              </a>
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let project">
              <app-status-chip [value]="project.status" kind="status"></app-status-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>Priority</th>
            <td mat-cell *matCellDef="let project">
              <app-status-chip [value]="project.priority" kind="priority"></app-status-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="timeline">
            <th mat-header-cell *matHeaderCellDef>Timeline</th>
            <td mat-cell *matCellDef="let project">
              <span class="text-muted">{{ formatDate(project.startDate) }} → {{ formatDate(project.endDate) }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="counts">
            <th mat-header-cell *matHeaderCellDef>Tasks / Teams</th>
            <td mat-cell *matCellDef="let project">
              <span class="counter">{{ project._count?.tasks ?? 0 }}</span>
              <span class="counter">{{ project._count?.teams ?? 0 }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let project">
              @if (canManage()) {
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openForm(project)">
                    <mat-icon>edit</mat-icon><span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="close(project)" [disabled]="project.status === 'COMPLETED'">
                    <mat-icon>task_alt</mat-icon><span>Mark completed</span>
                  </button>
                  <button mat-menu-item (click)="remove(project)">
                    <mat-icon>delete</mat-icon><span>Delete</span>
                  </button>
                </mat-menu>
              }
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
        <app-empty-state icon="folder_off" title="No projects found" message="Adjust filters or create a new project." />
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
        align-items: center;
      }
      .filters .search {
        flex: 1 1 260px;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 64px 0;
      }
      .project-link {
        display: flex;
        flex-direction: column;
        text-decoration: none;
        color: inherit;
        line-height: 1.25;
      }
      .project-link span {
        font-size: 0.78rem;
      }
      .counter {
        display: inline-block;
        min-width: 26px;
        text-align: center;
        background: #eef2ff;
        color: #4338ca;
        border-radius: 6px;
        padding: 2px 6px;
        margin-right: 6px;
        font-size: 0.78rem;
        font-weight: 600;
      }
    `,
  ],
})
export class Projects implements OnInit {
  private readonly projectsService = inject(ProjectService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(NotificationToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly priorities = PRIORITIES;
  readonly statuses = PROJECT_STATUSES;
  readonly columns = ['name', 'status', 'priority', 'timeline', 'counts', 'actions'];
  readonly loading = signal(true);
  readonly projects = signal<Project[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(10);

  readonly searchControl = this.fb.nonNullable.control('');
  readonly statusControl = this.fb.nonNullable.control('');
  readonly priorityControl = this.fb.nonNullable.control('');

  private page = 1;
  private searchTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    this.load();
    this.searchControl.valueChanges.subscribe(() => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.load();
      }, 300);
    });
    this.statusControl.valueChanges.subscribe(() => this.load());
    this.priorityControl.valueChanges.subscribe(() => this.load());
  }

  canManage(): boolean {
    return this.auth.isManager();
  }

  formatDate = formatDate;

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize.set(event.pageSize);
    this.load();
  }

  openForm(project?: Project): void {
    const ref = this.dialog.open(ProjectFormDialog, { data: { project }, width: '640px' });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      const request = project ? this.projectsService.update(project.id, payload) : this.projectsService.create(payload);
      request.subscribe({
        next: () => {
          this.toast.success(project ? 'Project updated' : 'Project created');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  close(project: Project): void {
    this.projectsService.close(project.id).subscribe({
      next: () => {
        this.toast.success('Project marked as completed');
        this.load();
      },
      error: (error) => this.toast.error(extractErrorMessage(error)),
    });
  }

  remove(project: Project): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete project',
        message: `Delete "${project.name}"? Tasks and teams linked to it will also be removed.`,
        confirmText: 'Delete',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.projectsService.remove(project.id).subscribe({
        next: () => {
          this.toast.success('Project deleted');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.projectsService
      .list({
        page: this.page,
        limit: this.pageSize(),
        search: this.searchControl.value || undefined,
        status: this.statusControl.value || undefined,
        priority: this.priorityControl.value || undefined,
      })
      .subscribe({
        next: (res) => {
          this.projects.set(res.data);
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
