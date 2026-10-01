import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { DashboardStats } from '../../core/models/dashboard.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { StatusChip } from '../../shared/components/status-chip/status-chip';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { formatDate, isOverdue, label, relativeTime } from '../../shared/utils/display';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    PageHeader,
    StatCard,
    StatusChip,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header
      [title]="'Hello, ' + (userName() || 'there')"
      subtitle="Here is what is happening across your projects today."
    >
      <button mat-stroked-button routerLink="/board">
        <mat-icon>view_kanban</mat-icon>
        Open board
      </button>
      <button mat-flat-button color="primary" routerLink="/tasks">
        <mat-icon>add_task</mat-icon>
        Manage tasks
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (stats(); as s) {
      <section class="stat-grid">
        <app-stat-card label="Total projects" [value]="s.projects.total" icon="folder" tint="#4f46e5" />
        <app-stat-card label="Active projects" [value]="s.projects.active" icon="play_circle" tint="#0ea5e9" />
        <app-stat-card label="Total tasks" [value]="s.tasks.total" icon="checklist" tint="#7c3aed" />
        <app-stat-card label="In progress" [value]="s.tasks.inProgress" icon="autorenew" tint="#f59e0b" />
        <app-stat-card label="Completed" [value]="s.tasks.done" icon="task_alt" tint="#16a34a" />
        <app-stat-card
          label="Overdue"
          [value]="s.tasks.overdue"
          icon="warning"
          tint="#dc2626"
          hint="Needs attention"
        />
      </section>

      <section class="charts">
        <mat-card class="card-surface chart-card" appearance="outlined">
          <mat-card-header>
            <mat-card-title>Task status distribution</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-wrap">
              <canvas baseChart [data]="statusChart()" [type]="'doughnut'" [options]="doughnutOptions"></canvas>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="card-surface chart-card" appearance="outlined">
          <mat-card-header>
            <mat-card-title>Progress updates (last 14 days)</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="chart-wrap">
              <canvas baseChart [data]="trendChart()" [type]="'line'" [options]="lineOptions"></canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      <section class="lists">
        <mat-card class="card-surface" appearance="outlined">
          <mat-card-header>
            <mat-card-title>Upcoming deadlines</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (s.upcomingTasks.length) {
              <div class="task-list">
                @for (task of s.upcomingTasks; track task.id) {
                  <div class="task-row">
                    <div class="task-main">
                      <strong>{{ task.title }}</strong>
                      <span class="text-muted">{{ task.project.name }}</span>
                    </div>
                    <app-status-chip [value]="task.priority" kind="priority"></app-status-chip>
                    <span class="due" [class.overdue]="overdue(task.dueDate, task.status)">
                      {{ formatDate(task.dueDate) }}
                    </span>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state icon="event_available" title="No upcoming deadlines" />
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="card-surface" appearance="outlined">
          <mat-card-header>
            <mat-card-title>Recent activity</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (s.recentActivity.length) {
              <div class="activity-list">
                @for (activity of s.recentActivity; track activity.id) {
                  <div class="activity-row">
                    <mat-icon>history</mat-icon>
                    <div class="activity-body">
                      <span>
                        <strong>{{ activity.user.name }}</strong>
                        moved <strong>{{ activity.task.title }}</strong>
                        to {{ label(activity.status) }}
                      </span>
                      <span class="text-muted">{{ relativeTime(activity.createdAt) }}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <app-empty-state icon="history" title="No recent activity" />
            }
          </mat-card-content>
        </mat-card>
      </section>
    }
  `,
  styles: [
    `
      .loading {
        display: grid;
        place-items: center;
        padding: 80px 0;
      }
      .stat-grid {
        margin-bottom: 20px;
      }
      .charts {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 16px;
        margin-bottom: 20px;
      }
      .chart-card mat-card-content {
        padding-top: 8px;
      }
      .chart-wrap {
        position: relative;
        height: 260px;
      }
      .lists {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .task-list,
      .activity-list {
        display: flex;
        flex-direction: column;
      }
      .task-row {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .task-row:last-child {
        border-bottom: none;
      }
      .task-main {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .task-main strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .task-main span {
        font-size: 0.8rem;
      }
      .due {
        font-size: 0.82rem;
        color: #475569;
        white-space: nowrap;
      }
      .due.overdue {
        color: #dc2626;
        font-weight: 600;
      }
      .activity-row {
        display: flex;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid #f1f5f9;
      }
      .activity-row:last-child {
        border-bottom: none;
      }
      .activity-row mat-icon {
        color: #94a3b8;
      }
      .activity-body {
        display: flex;
        flex-direction: column;
        font-size: 0.86rem;
        gap: 2px;
      }
      @media (max-width: 1000px) {
        .charts,
        .lists {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Dashboard implements OnInit {
  private readonly dashboard = inject(DashboardService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(NotificationToastService);

  readonly loading = signal(true);
  readonly stats = signal<DashboardStats | null>(null);
  readonly statusChart = signal<ChartData<'doughnut'>>({ labels: [], datasets: [{ data: [] }] });
  readonly trendChart = signal<ChartData<'line'>>({ labels: [], datasets: [] });

  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  readonly lineOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };

  ngOnInit(): void {
    this.dashboard.stats().subscribe({
      next: (res) => {
        this.stats.set(res.data);
        this.buildCharts(res.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }

  userName(): string {
    return this.auth.currentUser?.name ?? '';
  }

  label(value?: string | null): string {
    return label(value);
  }

  formatDate = formatDate;
  relativeTime = relativeTime;

  overdue(dueDate?: string | null, status?: string): boolean {
    return isOverdue(dueDate, status as never);
  }

  private buildCharts(stats: DashboardStats): void {
    this.statusChart.set({
      labels: ['To Do', 'In Progress', 'Done'],
      datasets: [
        {
          data: [stats.tasks.todo, stats.tasks.inProgress, stats.tasks.done],
          backgroundColor: ['#94a3b8', '#3b82f6', '#22c55e'],
          borderWidth: 0,
        },
      ],
    });

    this.trendChart.set({
      labels: stats.progressTrend.map((p) => formatDate(p.date)),
      datasets: [
        {
          data: stats.progressTrend.map((p) => p.count),
          label: 'Updates',
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.15)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    });
  }
}
