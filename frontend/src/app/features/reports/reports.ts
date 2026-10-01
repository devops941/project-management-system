import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { DashboardService } from '../../core/services/dashboard.service';
import { ProjectService } from '../../core/services/project.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { Project } from '../../core/models/project.model';
import { ReportOverview } from '../../core/models/dashboard.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatCard } from '../../shared/components/stat-card/stat-card';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

type ExportType = 'summary' | 'tasks' | 'workload';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    BaseChartDirective,
    PageHeader,
    StatCard,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Reports" subtitle="Progress, workload and exportable summaries.">
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
    } @else if (overview(); as data) {
      @if (data.summary; as summary) {
        <section class="stat-grid">
          <app-stat-card label="Total tasks" [value]="summary.metrics.total" icon="checklist" tint="#4f46e5" />
          <app-stat-card label="Completed" [value]="summary.metrics.completion + '%'" icon="task_alt" tint="#16a34a" />
          <app-stat-card label="Avg progress" [value]="summary.metrics.avgProgress + '%'" icon="trending_up" tint="#0ea5e9" />
          <app-stat-card label="Overdue" [value]="summary.metrics.overdue" icon="warning" tint="#dc2626" />
        </section>
      }

      <section class="charts">
        <mat-card class="card-surface chart-card" appearance="outlined">
          <mat-card-header><mat-card-title>Task status</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="chart-wrap">
              <canvas baseChart [data]="statusChart()" [type]="'bar'" [options]="barOptions"></canvas>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="card-surface chart-card" appearance="outlined">
          <mat-card-header><mat-card-title>Priority split</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="chart-wrap">
              <canvas baseChart [data]="priorityChart()" [type]="'pie'" [options]="pieOptions"></canvas>
            </div>
          </mat-card-content>
        </mat-card>
      </section>

      <mat-card class="card-surface" appearance="outlined">
        <mat-card-header><mat-card-title>Team workload</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (data.workload.length) {
            <table mat-table [dataSource]="data.workload" class="pms-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Member</th>
                <td mat-cell *matCellDef="let row">
                  <div class="member-cell">
                    <strong>{{ row.user.name }}</strong>
                    <span class="text-muted">{{ row.user.email }}</span>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let row">{{ row.total }}</td>
              </ng-container>
              <ng-container matColumnDef="inProgress">
                <th mat-header-cell *matHeaderCellDef>In progress</th>
                <td mat-cell *matCellDef="let row">{{ row.inProgress }}</td>
              </ng-container>
              <ng-container matColumnDef="done">
                <th mat-header-cell *matHeaderCellDef>Done</th>
                <td mat-cell *matCellDef="let row">{{ row.done }}</td>
              </ng-container>
              <ng-container matColumnDef="overdue">
                <th mat-header-cell *matHeaderCellDef>Overdue</th>
                <td mat-cell *matCellDef="let row">
                  <span [class.danger]="row.overdue > 0">{{ row.overdue }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="avgProgress">
                <th mat-header-cell *matHeaderCellDef>Avg progress</th>
                <td mat-cell *matCellDef="let row">{{ row.avgProgress }}%</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="workloadColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: workloadColumns"></tr>
            </table>
          } @else {
            <app-empty-state icon="groups" title="No workload data" />
          }
        </mat-card-content>
      </mat-card>

      <mat-card class="card-surface exports" appearance="outlined">
        <mat-card-header><mat-card-title>Export reports</mat-card-title></mat-card-header>
        <mat-card-content class="export-actions">
          @for (option of exportOptions; track option.type) {
            <div class="export-row">
              <span>{{ option.label }}</span>
              <div>
                <button mat-stroked-button (click)="export(option.type, 'pdf')" [disabled]="exporting()">
                  <mat-icon>picture_as_pdf</mat-icon>
                  PDF
                </button>
                <button mat-stroked-button (click)="export(option.type, 'excel')" [disabled]="exporting()">
                  <mat-icon>table_view</mat-icon>
                  Excel
                </button>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    } @else {
      <app-empty-state icon="bar_chart" title="No report data available" />
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
      .stat-grid {
        margin-bottom: 20px;
      }
      .charts {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 20px;
      }
      .chart-wrap {
        position: relative;
        height: 280px;
      }
      .member-cell {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .member-cell span {
        font-size: 0.78rem;
      }
      .danger {
        color: #dc2626;
        font-weight: 600;
      }
      .exports {
        margin-top: 20px;
      }
      .export-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .export-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 12px;
      }
      .export-row:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      @media (max-width: 900px) {
        .charts {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Reports implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly projectsService = inject(ProjectService);
  private readonly toast = inject(NotificationToastService);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly overview = signal<ReportOverview | null>(null);
  readonly projects = signal<Project[]>([]);
  readonly statusChart = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  readonly priorityChart = signal<ChartData<'pie'>>({ labels: [], datasets: [{ data: [] }] });

  readonly workloadColumns = ['name', 'total', 'inProgress', 'done', 'overdue', 'avgProgress'];
  readonly exportOptions: { type: ExportType; label: string }[] = [
    { type: 'summary', label: 'Project summary' },
    { type: 'tasks', label: 'Task list' },
    { type: 'workload', label: 'Team workload' },
  ];

  readonly projectControl = this.fb.nonNullable.control('');

  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
  };
  readonly pieOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  ngOnInit(): void {
    this.load();
    this.projectsService.list({ limit: 100 }).subscribe({ next: (res) => this.projects.set(res.data) });
    this.projectControl.valueChanges.subscribe(() => this.load());
  }

  export(type: ExportType, format: 'pdf' | 'excel'): void {
    this.exporting.set(true);
    this.dashboardService.exportReport(type, format, this.projectControl.value || undefined).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        link.click();
        URL.revokeObjectURL(url);
        this.toast.success(`${format === 'pdf' ? 'PDF' : 'Excel'} report downloaded`);
      },
      error: (error) => {
        this.exporting.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.dashboardService.reportsOverview(this.projectControl.value || undefined).subscribe({
      next: (res) => {
        this.overview.set(res.data);
        this.buildCharts(res.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }

  private buildCharts(data: ReportOverview): void {
    const byStatus = data.taskStatus.byStatus;
    this.statusChart.set({
      labels: ['To Do', 'In Progress', 'Done'],
      datasets: [
        {
          data: [byStatus.TODO ?? 0, byStatus.IN_PROGRESS ?? 0, byStatus.DONE ?? 0],
          backgroundColor: ['#94a3b8', '#3b82f6', '#22c55e'],
          borderRadius: 6,
        },
      ],
    });

    const byPriority = data.summary?.byPriority ?? {};
    this.priorityChart.set({
      labels: Object.keys(byPriority),
      datasets: [
        {
          data: Object.values(byPriority),
          backgroundColor: ['#0ea5e9', '#f59e0b', '#f97316', '#dc2626'],
        },
      ],
    });
  }
}
