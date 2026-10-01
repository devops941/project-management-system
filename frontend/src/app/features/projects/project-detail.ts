import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { ProjectService } from '../../core/services/project.service';
import { TaskService } from '../../core/services/task.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { Project } from '../../core/models/project.model';
import { Task } from '../../core/models/task.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusChip } from '../../shared/components/status-chip/status-chip';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { formatDate } from '../../shared/utils/display';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    PageHeader,
    StatusChip,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (project(); as p) {
      <app-page-header [title]="p.name" [subtitle]="p.code + ' · ' + p.status">
        <button mat-stroked-button routerLink="/projects">
          <mat-icon>arrow_back</mat-icon>
          Back
        </button>
      </app-page-header>

      <section class="meta-grid">
        <mat-card class="card-surface meta-card" appearance="outlined">
          <span class="meta-label">Status</span>
          <app-status-chip [value]="p.status" kind="status"></app-status-chip>
        </mat-card>
        <mat-card class="card-surface meta-card" appearance="outlined">
          <span class="meta-label">Priority</span>
          <app-status-chip [value]="p.priority" kind="priority"></app-status-chip>
        </mat-card>
        <mat-card class="card-surface meta-card" appearance="outlined">
          <span class="meta-label">Timeline</span>
          <strong>{{ formatDate(p.startDate) }} → {{ formatDate(p.endDate) }}</strong>
        </mat-card>
        <mat-card class="card-surface meta-card" appearance="outlined">
          <span class="meta-label">Tasks</span>
          <strong>{{ tasks().length }}</strong>
        </mat-card>
      </section>

      @if (p.description) {
        <mat-card class="card-surface description" appearance="outlined">
          <h3>Description</h3>
          <p>{{ p.description }}</p>
        </mat-card>
      }

      <mat-tab-group class="detail-tabs">
        <mat-tab label="Tasks">
          @if (tasks().length) {
            <table mat-table [dataSource]="tasks()" class="pms-table">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>Task</th>
                <td mat-cell *matCellDef="let task"><strong>{{ task.title }}</strong></td>
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
                <td mat-cell *matCellDef="let task">{{ formatDate(task.dueDate) }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="taskColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: taskColumns"></tr>
            </table>
          } @else {
            <app-empty-state icon="checklist" title="No tasks yet" message="Tasks assigned to this project appear here." />
          }
        </mat-tab>

        <mat-tab label="Teams">
          @if (p.teams?.length) {
            <div class="team-grid">
              @for (team of p.teams; track team.id) {
                <mat-card class="card-surface team-card" appearance="outlined">
                  <mat-card-title>{{ team.name }}</mat-card-title>
                  <mat-card-content>
                    <p class="text-muted">Lead: {{ team.lead?.name || 'Unassigned' }}</p>
                    <p class="text-muted">{{ team._count?.members ?? 0 }} members</p>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          } @else {
            <app-empty-state icon="groups" title="No teams assigned" />
          }
        </mat-tab>
      </mat-tab-group>
    } @else {
      <app-empty-state icon="folder_off" title="Project not found" />
    }
  `,
  styles: [
    `
      .loading {
        display: grid;
        place-items: center;
        padding: 64px 0;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-bottom: 16px;
      }
      .meta-card {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .meta-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #94a3b8;
      }
      .description {
        padding: 16px;
        margin-bottom: 16px;
      }
      .description h3 {
        margin: 0 0 6px;
        font-size: 1rem;
      }
      .description p {
        margin: 0;
        color: #475569;
        line-height: 1.6;
      }
      .detail-tabs {
        background: #fff;
        border-radius: 12px;
        padding: 8px;
        border: 1px solid var(--pms-border);
      }
      .progress-cell {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 160px;
      }
      .progress-cell mat-progress-bar {
        flex: 1;
      }
      .team-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 16px;
        padding: 16px 0;
      }
    `,
  ],
})
export class ProjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectsService = inject(ProjectService);
  private readonly tasksService = inject(TaskService);
  private readonly toast = inject(NotificationToastService);

  readonly loading = signal(true);
  readonly project = signal<Project | null>(null);
  readonly tasks = signal<Task[]>([]);
  readonly taskColumns = ['title', 'status', 'priority', 'progress', 'dueDate'];

  formatDate = formatDate;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.projectsService.get(id).subscribe({
      next: (res) => {
        this.project.set(res.data.project);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });

    this.tasksService.list({ projectId: id, limit: 100 }).subscribe({
      next: (res) => this.tasks.set(res.data),
      error: () => this.tasks.set([]),
    });
  }
}
