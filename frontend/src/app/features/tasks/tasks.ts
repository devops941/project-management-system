import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { UserService } from '../../core/services/user.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { Project } from '../../core/models/project.model';
import { Task } from '../../core/models/task.model';
import { User } from '../../core/models/user.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusChip } from '../../shared/components/status-chip/status-chip';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { TaskFormDialog } from './task-form-dialog';
import { TaskProgressDialog } from './task-progress-dialog';
import { DeadlineDialog } from './deadline-dialog';
import { PRIORITIES, TASK_STATUSES, formatDate, isOverdue, label } from '../../shared/utils/display';

@Component({
  selector: 'app-tasks',
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
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    PageHeader,
    StatusChip,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Tasks" subtitle="Every piece of work, in one filterable list.">
      @if (canManage()) {
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>add_task</mat-icon>
          New task
        </button>
      }
    </app-page-header>

    <mat-card class="card-surface filters" appearance="outlined">
      <mat-form-field appearance="outline" class="search">
        <mat-label>Search tasks</mat-label>
        <mat-icon matPrefix>search</mat-icon>
        <input matInput [formControl]="searchControl" placeholder="Title" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Project</mat-label>
        <mat-select [formControl]="projectControl">
          <mat-option value="">All projects</mat-option>
          @for (project of projects(); track project.id) {
            <mat-option [value]="project.id">{{ project.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Status</mat-label>
        <mat-select [formControl]="statusControl">
          <mat-option value="">All</mat-option>
          @for (s of statuses; track s) {
            <mat-option [value]="s">{{ label(s) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Priority</mat-label>
        <mat-select [formControl]="priorityControl">
          <mat-option value="">All</mat-option>
          @for (p of priorities; track p) {
            <mat-option [value]="p">{{ label(p) }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-card>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (tasks().length) {
      <mat-card class="card-surface" appearance="outlined">
        <table mat-table [dataSource]="tasks()" class="pms-table">
          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef>Task</th>
            <td mat-cell *matCellDef="let task">
              <div class="task-cell">
                <strong>{{ task.title }}</strong>
                <span class="text-muted">{{ task.project.name }}</span>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="assignees">
            <th mat-header-cell *matHeaderCellDef>Assignees</th>
            <td mat-cell *matCellDef="let task">
              @if (task.assignments.length) {
                <div class="avatar-stack">
                  @for (assignment of task.assignments; track assignment.id) {
                    <span class="avatar" [matTooltip]="assignment.user.name">{{ initials(assignment.user.name) }}</span>
                  }
                </div>
              } @else {
                <span class="text-muted">Unassigned</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let task">
              <app-status-chip [value]="task.status" kind="status"></app-status-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="priority">
            <th mat-header-cell *matHeaderCellDef>Priority</th>
            <td mat-cell *matCellDef="let task">
              <app-status-chip [value]="task.priority" kind="priority"></app-status-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="progress">
            <th mat-header-cell *matHeaderCellDef>Progress</th>
            <td mat-cell *matCellDef="let task">
              <div class="progress-cell">
                <mat-progress-bar mode="determinate" [value]="task.progress"></mat-progress-bar>
                <span>{{ task.progress }}%</span>
              </div>
            </td>
          </ng-container>
          <ng-container matColumnDef="dueDate">
            <th mat-header-cell *matHeaderCellDef>Due</th>
            <td mat-cell *matCellDef="let task">
              <span [class.overdue]="overdue(task.dueDate, task.status)">{{ formatDate(task.dueDate) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let task">
              <button mat-icon-button [matMenuTriggerFor]="menu">
                <mat-icon>more_vert</mat-icon>
              </button>
              <mat-menu #menu="matMenu">
                <button mat-menu-item (click)="openProgress(task)">
                  <mat-icon>trending_up</mat-icon><span>Update progress</span>
                </button>
                @if (canManage()) {
                  <button mat-menu-item (click)="openForm(task)">
                    <mat-icon>edit</mat-icon><span>Edit</span>
                  </button>
                  <button mat-menu-item (click)="extend(task)">
                    <mat-icon>event</mat-icon><span>Extend deadline</span>
                  </button>
                  <button mat-menu-item (click)="remove(task)">
                    <mat-icon>delete</mat-icon><span>Delete</span>
                  </button>
                }
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
        <app-empty-state icon="checklist" title="No tasks found" message="Try adjusting filters or create a task." />
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
        flex: 1 1 220px;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 64px 0;
      }
      .task-cell {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .task-cell span {
        font-size: 0.78rem;
      }
      .avatar-stack {
        display: flex;
      }
      .avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #4f46e5;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 0.68rem;
        font-weight: 600;
        border: 2px solid #fff;
        margin-left: -8px;
      }
      .avatar:first-child {
        margin-left: 0;
      }
      .progress-cell {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 140px;
      }
      .progress-cell mat-progress-bar {
        flex: 1;
      }
      .overdue {
        color: #dc2626;
        font-weight: 600;
      }
    `,
  ],
})
export class Tasks implements OnInit {
  private readonly tasksService = inject(TaskService);
  private readonly projectsService = inject(ProjectService);
  private readonly usersService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(NotificationToastService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly priorities = PRIORITIES;
  readonly statuses = TASK_STATUSES;
  readonly columns = ['title', 'assignees', 'status', 'priority', 'progress', 'dueDate', 'actions'];
  readonly loading = signal(true);
  readonly tasks = signal<Task[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(10);

  readonly searchControl = this.fb.nonNullable.control('');
  readonly projectControl = this.fb.nonNullable.control('');
  readonly statusControl = this.fb.nonNullable.control('');
  readonly priorityControl = this.fb.nonNullable.control('');

  private users: User[] = [];
  private page = 1;
  private searchTimer?: ReturnType<typeof setTimeout>;

  label = label;
  formatDate = formatDate;
  initials = (name?: string | null) => (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  ngOnInit(): void {
    this.load();
    this.projectsService.list({ limit: 100 }).subscribe({ next: (res) => this.projects.set(res.data) });
    this.usersService.list({ limit: 100 }).subscribe({ next: (res) => (this.users = res.data) });

    this.searchControl.valueChanges.subscribe(() => {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.load();
      }, 300);
    });
    this.projectControl.valueChanges.subscribe(() => this.load());
    this.statusControl.valueChanges.subscribe(() => this.load());
    this.priorityControl.valueChanges.subscribe(() => this.load());
  }

  canManage(): boolean {
    return this.auth.isManager();
  }

  overdue(dueDate?: string | null, status?: string): boolean {
    return isOverdue(dueDate, status as never);
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize.set(event.pageSize);
    this.load();
  }

  openForm(task?: Task): void {
    const ref = this.dialog.open(TaskFormDialog, {
      data: { task, projects: this.projects(), users: this.users },
      width: '680px',
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      const request = task ? this.tasksService.update(task.id, payload) : this.tasksService.create(payload);
      request.subscribe({
        next: () => {
          this.toast.success(task ? 'Task updated' : 'Task created');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  openProgress(task: Task): void {
    const ref = this.dialog.open(TaskProgressDialog, { data: { task }, width: '520px' });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.tasksService.updateProgress(task.id, payload).subscribe({
        next: () => {
          this.toast.success('Progress updated');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  extend(task: Task): void {
    const ref = this.dialog.open(DeadlineDialog, { data: { task }, width: '520px' });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.tasksService.extendDeadline(task.id, payload.dueDate, payload.comment).subscribe({
        next: () => {
          this.toast.success('Deadline updated');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  remove(task: Task): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete task',
        message: `Delete "${task.title}"? This also removes its assignments and history.`,
        confirmText: 'Delete',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.tasksService.remove(task.id).subscribe({
        next: () => {
          this.toast.success('Task deleted');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.tasksService
      .list({
        page: this.page,
        limit: this.pageSize(),
        search: this.searchControl.value || undefined,
        projectId: this.projectControl.value || undefined,
        status: this.statusControl.value || undefined,
        priority: this.priorityControl.value || undefined,
      })
      .subscribe({
        next: (res) => {
          this.tasks.set(res.data);
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
