import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { AppNotification, NotificationType } from '../../core/models/notification.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { relativeTime } from '../../shared/utils/display';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    PageHeader,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Notifications" subtitle="Assignments, status changes and deadline alerts.">
      <button mat-stroked-button (click)="scan()" [disabled]="scanning()" matTooltip="Re-run deadline scan now">
        <mat-icon>refresh</mat-icon>
        Run scan
      </button>
      <button mat-flat-button color="primary" (click)="markAllRead()" [disabled]="!hasUnread()">
        <mat-icon>done_all</mat-icon>
        Mark all read
      </button>
    </app-page-header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (notifications().length) {
      <mat-card class="card-surface" appearance="outlined">
        @for (notification of notifications(); track notification.id) {
          <div class="notification-row" [class.unread]="!notification.isRead">
            <div class="icon" [ngClass]="'icon-' + notification.type.toLowerCase()">
              <mat-icon>{{ icon(notification.type) }}</mat-icon>
            </div>
            <div class="body">
              <div class="body-head">
                <strong>{{ notification.title }}</strong>
                @if (!notification.isRead) {
                  <span class="dot"></span>
                }
              </div>
              <p>{{ notification.message }}</p>
              <span class="text-muted time">{{ relativeTime(notification.createdAt) }}</span>
            </div>
            <div class="actions">
              @if (!notification.isRead) {
                <button mat-icon-button matTooltip="Mark read" (click)="markRead(notification)">
                  <mat-icon>mark_email_read</mat-icon>
                </button>
              }
              <button mat-icon-button matTooltip="Delete" (click)="remove(notification)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>
          <mat-divider></mat-divider>
        }
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
        <app-empty-state icon="notifications_off" title="No notifications" message="You are all caught up." />
      </mat-card>
    }
  `,
  styles: [
    `
      .loading {
        display: grid;
        place-items: center;
        padding: 64px 0;
      }
      .notification-row {
        display: flex;
        gap: 16px;
        padding: 16px;
        align-items: flex-start;
        transition: background 0.15s ease;
      }
      .notification-row.unread {
        background: #f5f7ff;
      }
      .icon {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        flex-shrink: 0;
        background: #e2e8f0;
        color: #475569;
      }
      .icon-assignment { background: #e0e7ff; color: #4338ca; }
      .icon-deadline_soon { background: #fef3c7; color: #b45309; }
      .icon-overdue { background: #fee2e2; color: #b91c1c; }
      .icon-status_change { background: #dbeafe; color: #1d4ed8; }
      .icon-system { background: #e2e8f0; color: #475569; }
      .body {
        flex: 1;
        min-width: 0;
      }
      .body-head {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #4f46e5;
      }
      .body p {
        margin: 4px 0;
        color: #475569;
        line-height: 1.5;
      }
      .time {
        font-size: 0.78rem;
      }
      .actions {
        display: flex;
        flex-shrink: 0;
      }
    `,
  ],
})
export class Notifications implements OnInit {
  private readonly notificationsService = inject(NotificationService);
  private readonly toast = inject(NotificationToastService);

  readonly loading = signal(true);
  readonly scanning = signal(false);
  readonly notifications = signal<AppNotification[]>([]);
  readonly total = signal(0);
  readonly pageSize = signal(10);

  relativeTime = relativeTime;
  private page = 1;

  ngOnInit(): void {
    this.load();
  }

  hasUnread(): boolean {
    return this.notifications().some((n) => !n.isRead);
  }

  icon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      ASSIGNMENT: 'assignment_ind',
      DEADLINE_SOON: 'schedule',
      OVERDUE: 'warning',
      STATUS_CHANGE: 'swap_horiz',
      SYSTEM: 'info',
    };
    return icons[type] ?? 'notifications';
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize.set(event.pageSize);
    this.load();
  }

  markRead(notification: AppNotification): void {
    this.notificationsService.markRead([notification.id]).subscribe({
      next: () => this.load(),
      error: (error) => this.toast.error(extractErrorMessage(error)),
    });
  }

  markAllRead(): void {
    this.notificationsService.markRead().subscribe({
      next: () => {
        this.toast.success('All notifications marked as read');
        this.load();
      },
      error: (error) => this.toast.error(extractErrorMessage(error)),
    });
  }

  remove(notification: AppNotification): void {
    this.notificationsService.remove(notification.id).subscribe({
      next: () => this.load(),
      error: (error) => this.toast.error(extractErrorMessage(error)),
    });
  }

  scan(): void {
    this.scanning.set(true);
    this.notificationsService.runScan().subscribe({
      next: (res) => {
        this.scanning.set(false);
        this.toast.success(`Scan complete: ${res.data.dueSoon} due soon, ${res.data.overdue} overdue`);
        this.load();
      },
      error: (error) => {
        this.scanning.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.notificationsService.list({ page: this.page, limit: this.pageSize() }).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
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
