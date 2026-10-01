import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Role } from '../../core/models/auth.model';
import { initials } from '../../shared/utils/display';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  roles?: Role[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav #sidenav mode="side" [opened]="isHandset ? false : true" class="shell-sidenav">
        <div class="brand">
          <div class="brand-logo">PMS</div>
          <div class="brand-text">
            <strong>Project Management</strong>
            <span>System</span>
          </div>
        </div>
        <mat-divider></mat-divider>
        <mat-nav-list>
          @for (item of visibleNav(); track item.link) {
            <a
              mat-list-item
              [routerLink]="item.link"
              routerLinkActive="active-link"
              (click)="isHandset && sidenav.close()"
            >
              <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
              <span matListItemTitle>{{ item.label }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar color="primary" class="shell-toolbar">
          <button mat-icon-button (click)="sidenav.toggle()" matTooltip="Toggle navigation">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="toolbar-title">Project Management System</span>
          <span class="spacer"></span>

          <button mat-icon-button routerLink="/notifications" matTooltip="Notifications">
            <mat-icon
              [matBadge]="unread() || null"
              matBadgeColor="warn"
              matBadgeSize="small"
              [matBadgeHidden]="unread() === 0"
            >
              notifications
            </mat-icon>
          </button>

          <button mat-icon-button [matMenuTriggerFor]="userMenu" matTooltip="Account">
            <span class="avatar">{{ userInitials() }}</span>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="menu-header">
              <strong>{{ user()?.name }}</strong>
              <span>{{ user()?.email }}</span>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item routerLink="/profile">
              <mat-icon>person</mat-icon>
              <span>My Profile</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <main class="shell-content">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .shell {
        height: 100vh;
        background: #f1f5f9;
      }
      .shell-sidenav {
        width: 256px;
        border-right: none;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px 16px;
      }
      .brand-logo {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: #fff;
        display: grid;
        place-items: center;
        font-weight: 700;
        letter-spacing: 0.5px;
      }
      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
        font-size: 0.9rem;
      }
      .brand-text strong {
        color: #0f172a;
      }
      .brand-text span {
        color: #64748b;
      }
      .active-link {
        background: rgba(79, 70, 229, 0.1);
        border-right: 3px solid #4f46e5;
      }
      .active-link mat-icon {
        color: #4f46e5;
      }
      .shell-toolbar {
        position: sticky;
        top: 0;
        z-index: 5;
      }
      .toolbar-title {
        margin-left: 8px;
        font-weight: 600;
      }
      .spacer {
        flex: 1 1 auto;
      }
      .avatar {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.22);
        font-size: 0.8rem;
        font-weight: 600;
      }
      .menu-header {
        display: flex;
        flex-direction: column;
        padding: 12px 16px;
        line-height: 1.3;
      }
      .menu-header span {
        font-size: 0.78rem;
        color: #64748b;
      }
      .shell-content {
        padding: 24px;
        max-width: 1400px;
        margin: 0 auto;
        width: 100%;
        box-sizing: border-box;
      }
      @media (max-width: 900px) {
        .shell-content {
          padding: 16px;
        }
        .toolbar-title {
          font-size: 1rem;
        }
      }
    `,
  ],
})
export class Shell implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly user = toSignal(this.auth.user$, { initialValue: this.auth.currentUser });
  readonly unread = signal(0);
  readonly isHandset = window.matchMedia('(max-width: 900px)').matches;

  private readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', link: '/dashboard' },
    { label: 'Projects', icon: 'folder', link: '/projects' },
    { label: 'Teams', icon: 'groups', link: '/teams' },
    { label: 'Tasks', icon: 'checklist', link: '/tasks' },
    { label: 'Kanban Board', icon: 'view_kanban', link: '/board' },
    { label: 'Deadlines', icon: 'schedule', link: '/deadlines' },
    { label: 'Reports', icon: 'bar_chart', link: '/reports', roles: ['ADMIN', 'MANAGER'] },
    { label: 'Users', icon: 'manage_accounts', link: '/users', roles: ['ADMIN'] },
    { label: 'Profile', icon: 'person', link: '/profile' },
  ];

  ngOnInit(): void {
    this.loadUnread();
  }

  visibleNav(): NavItem[] {
    return this.navItems.filter((item) => !item.roles || this.auth.hasRole(...item.roles));
  }

  userInitials(): string {
    return initials(this.auth.currentUser?.name);
  }

  logout(): void {
    this.auth.logout();
  }

  private loadUnread(): void {
    this.notifications.unreadCount().subscribe({
      next: (res) => this.unread.set(res.data.count),
      error: () => this.unread.set(0),
    });
  }
}
