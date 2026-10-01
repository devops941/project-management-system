import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { DashboardService } from '../../core/services/dashboard.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { DeadlineOverview } from '../../core/models/dashboard.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { StatusChip } from '../../shared/components/status-chip/status-chip';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { formatDate } from '../../shared/utils/display';

@Component({
  selector: 'app-deadlines',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    PageHeader,
    StatusChip,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Deadlines" subtitle="Tasks approaching or past their due date.">
      <button mat-stroked-button (click)="load()">
        <mat-icon>refresh</mat-icon>
        Refresh
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (overview(); as data) {
      <section class="deadline-grid">
        <mat-card class="card-surface" appearance="outlined">
          <mat-card-header>
            <mat-icon class="header-icon warn">warning</mat-icon>
            <mat-card-title>Overdue ({{ data.overdue.length }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (data.overdue.length) {
              <table mat-table [dataSource]="data.overdue" class="pms-table">
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Task</th>
                  <td mat-cell *matCellDef="let task">
                    <div class="task-cell">
                      <strong>{{ task.title }}</strong>
                      <span class="text-muted">{{ task.project.name }}</span>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="priority">
                  <th mat-header-cell *matHeaderCellDef>Priority</th>
                  <td mat-cell *matCellDef="let task">
                    <app-status-chip [value]="task.priority" kind="priority"></app-status-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="dueDate">
                  <th mat-header-cell *matHeaderCellDef>Due</th>
                  <td mat-cell *matCellDef="let task">
                    <span class="overdue">{{ formatDate(task.dueDate) }}</span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns"></tr>
              </table>
            } @else {
              <app-empty-state icon="check_circle" title="Nothing overdue" message="Great job keeping on top of things." />
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="card-surface" appearance="outlined">
          <mat-card-header>
            <mat-icon class="header-icon soon">schedule</mat-icon>
            <mat-card-title>Upcoming ({{ data.upcoming.length }})</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (data.upcoming.length) {
              <table mat-table [dataSource]="data.upcoming" class="pms-table">
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Task</th>
                  <td mat-cell *matCellDef="let task">
                    <div class="task-cell">
                      <strong>{{ task.title }}</strong>
                      <span class="text-muted">{{ task.project.name }}</span>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="priority">
                  <th mat-header-cell *matHeaderCellDef>Priority</th>
                  <td mat-cell *matCellDef="let task">
                    <app-status-chip [value]="task.priority" kind="priority"></app-status-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="dueDate">
                  <th mat-header-cell *matHeaderCellDef>Due</th>
                  <td mat-cell *matCellDef="let task">{{ formatDate(task.dueDate) }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns"></tr>
              </table>
            } @else {
              <app-empty-state icon="event_available" title="No upcoming deadlines" />
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
        padding: 64px 0;
      }
      .deadline-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      mat-card-header {
        align-items: center;
      }
      .header-icon {
        margin-right: 8px;
      }
      .header-icon.warn {
        color: #dc2626;
      }
      .header-icon.soon {
        color: #f59e0b;
      }
      .task-cell {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }
      .task-cell span {
        font-size: 0.78rem;
      }
      .overdue {
        color: #dc2626;
        font-weight: 600;
      }
      @media (max-width: 900px) {
        .deadline-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class Deadlines implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(NotificationToastService);

  readonly loading = signal(true);
  readonly overview = signal<DeadlineOverview | null>(null);
  readonly columns = ['title', 'priority', 'dueDate'];

  formatDate = formatDate;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.dashboardService.deadlines().subscribe({
      next: (res) => {
        this.overview.set(res.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }
}
