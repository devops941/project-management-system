import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { Project } from '../../core/models/project.model';
import { BoardColumns, Task, TaskStatus } from '../../core/models/task.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusChip } from '../../shared/components/status-chip/status-chip';
import { TaskProgressDialog } from '../tasks/task-progress-dialog';
import { formatDate, isOverdue } from '../../shared/utils/display';

interface ColumnDef {
  status: TaskStatus;
  title: string;
  accent: string;
}

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageHeader,
    StatusChip,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Kanban board" subtitle="Drag cards between columns to update status.">
      <mat-form-field appearance="outline" class="project-filter">
        <mat-label>Project</mat-label>
        <mat-select [formControl]="projectControl">
          <mat-option value="">All projects</mat-option>
          @for (project of projects(); track project.id) {
            <mat-option [value]="project.id">{{ project.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </app-page-header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else {
      <div class="board" cdkDropListGroup>
        @for (column of columns; track column.status) {
          <section class="board-column">
            <header class="column-head" [style.border-top-color]="column.accent">
              <span class="column-title">{{ column.title }}</span>
              <span class="column-count">{{ tasksFor(column.status).length }}</span>
            </header>

            <div
              class="column-body"
              cdkDropList
              [cdkDropListData]="tasksFor(column.status)"
              [id]="'column-' + column.status"
              [cdkDropListConnectedTo]="connectedLists"
              (cdkDropListDropped)="drop($event, column.status)"
            >
              @for (task of tasksFor(column.status); track task.id) {
                <mat-card class="task-card" appearance="outlined" cdkDrag>
                  <div class="task-card-head">
                    <span class="project-tag">{{ task.project.code || task.project.name }}</span>
                    <app-status-chip [value]="task.priority" kind="priority"></app-status-chip>
                  </div>
                  <h4>{{ task.title }}</h4>
                  @if (task.assignments.length) {
                    <div class="assignees">
                      @for (assignment of task.assignments; track assignment.id) {
                        <span class="avatar" [matTooltip]="assignment.user.name">{{ initials(assignment.user.name) }}</span>
                      }
                    </div>
                  }
                  <footer class="task-card-foot">
                    <span class="due" [class.overdue]="overdue(task)">
                      <mat-icon>event</mat-icon>
                      {{ formatDate(task.dueDate) }}
                    </span>
                    <span class="progress">{{ task.progress }}%</span>
                  </footer>
                  <button mat-icon-button class="card-edit" matTooltip="Update progress" (click)="openProgress(task)">
                    <mat-icon>edit_note</mat-icon>
                  </button>
                </mat-card>
              } @empty {
                <div class="empty-column">Drop tasks here</div>
              }
            </div>
          </section>
        }
      </div>
    }
  `,
  styles: [
    `
      .project-filter {
        width: 240px;
      }
      .loading {
        display: grid;
        place-items: center;
        padding: 64px 0;
      }
      .board {
        display: grid;
        grid-template-columns: repeat(3, minmax(260px, 1fr));
        gap: 16px;
        align-items: start;
      }
      .board-column {
        background: #eef2f7;
        border-radius: 14px;
        padding: 12px;
        min-height: 200px;
      }
      .column-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 10px 12px;
        border-top: 3px solid #94a3b8;
        margin: -12px -12px 12px;
        border-radius: 14px 14px 0 0;
        background: #fff;
      }
      .column-title {
        font-weight: 600;
        color: #0f172a;
      }
      .column-count {
        background: #e2e8f0;
        color: #475569;
        border-radius: 999px;
        padding: 1px 10px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .column-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 120px;
      }
      .task-card {
        padding: 12px;
        position: relative;
        cursor: grab;
      }
      .task-card-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }
      .project-tag {
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6366f1;
        font-weight: 600;
      }
      .task-card h4 {
        margin: 0 0 10px;
        font-size: 0.95rem;
        line-height: 1.35;
        padding-right: 28px;
      }
      .assignees {
        display: flex;
        margin-bottom: 10px;
      }
      .avatar {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #0ea5e9;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 0.62rem;
        font-weight: 600;
        border: 2px solid #fff;
        margin-left: -6px;
      }
      .avatar:first-child {
        margin-left: 0;
      }
      .task-card-foot {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.78rem;
        color: #64748b;
      }
      .due {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .due mat-icon {
        font-size: 15px;
        width: 15px;
        height: 15px;
      }
      .due.overdue {
        color: #dc2626;
        font-weight: 600;
      }
      .progress {
        font-weight: 600;
        color: #4f46e5;
      }
      .card-edit {
        position: absolute;
        top: 8px;
        right: 8px;
        transform: scale(0.85);
      }
      .empty-column {
        border: 1.5px dashed #cbd5e1;
        border-radius: 10px;
        padding: 24px 12px;
        text-align: center;
        color: #94a3b8;
        font-size: 0.82rem;
      }
      .cdk-drag-preview {
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
        border-radius: 12px;
      }
      .cdk-drag-placeholder {
        opacity: 0.35;
      }
      @media (max-width: 900px) {
        .board {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Board implements OnInit {
  private readonly tasksService = inject(TaskService);
  private readonly projectsService = inject(ProjectService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(NotificationToastService);
  private readonly fb = inject(FormBuilder);

  readonly columns: ColumnDef[] = [
    { status: 'TODO', title: 'To Do', accent: '#94a3b8' },
    { status: 'IN_PROGRESS', title: 'In Progress', accent: '#3b82f6' },
    { status: 'DONE', title: 'Done', accent: '#22c55e' },
  ];
  readonly connectedLists = ['column-TODO', 'column-IN_PROGRESS', 'column-DONE'];

  readonly loading = signal(true);
  readonly projects = signal<Project[]>([]);
  readonly board = signal<BoardColumns>({ TODO: [], IN_PROGRESS: [], DONE: [] });

  readonly projectControl = this.fb.nonNullable.control('');

  formatDate = formatDate;
  initials = (name?: string | null) => (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

  ngOnInit(): void {
    this.load();
    this.projectsService.list({ limit: 100 }).subscribe({ next: (res) => this.projects.set(res.data) });
    this.projectControl.valueChanges.subscribe(() => this.load());
  }

  tasksFor(status: TaskStatus): Task[] {
    return this.board()[status];
  }

  overdue(task: Task): boolean {
    return isOverdue(task.dueDate, task.status);
  }

  drop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    const current = this.board();

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.board.set({ ...current });
      return;
    }

    const task = event.previousContainer.data[event.previousIndex];
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    this.board.set({ ...current });

    const progress = targetStatus === 'DONE' ? 100 : targetStatus === 'TODO' ? 0 : task.progress;

    this.tasksService.updateProgress(task.id, { status: targetStatus, progress }).subscribe({
      next: () => this.toast.success(`"${task.title}" moved to ${this.columnTitle(targetStatus)}`),
      error: (error) => {
        this.toast.error(extractErrorMessage(error));
        this.load();
      },
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

  private columnTitle(status: TaskStatus): string {
    return this.columns.find((c) => c.status === status)?.title ?? status;
  }

  private load(): void {
    this.loading.set(true);
    this.tasksService.board(this.projectControl.value || undefined).subscribe({
      next: (res) => {
        this.board.set(res.data.columns);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }
}
