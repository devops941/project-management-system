import { ChangeDetectionStrategy, Component, Inject, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { TeamService } from '../../core/services/team.service';
import { UserService } from '../../core/services/user.service';
import { NotificationToastService } from '../../core/services/toast.service';
import { extractErrorMessage } from '../../core/interceptors/auth.interceptor';
import { Project } from '../../core/models/project.model';
import { Team, TeamPayload } from '../../core/models/team.model';
import { User } from '../../core/models/user.model';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../shared/components/confirm-dialog/confirm-dialog';
import { initials, label } from '../../shared/utils/display';

@Component({
  selector: 'app-team-form-dialog',
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
    <h2 mat-dialog-title>{{ data.team ? 'Edit team' : 'New team' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline">
          <mat-label>Team name</mat-label>
          <input matInput formControlName="name" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Project</mat-label>
          <mat-select formControlName="projectId">
            <mat-option value="">Unassigned</mat-option>
            @for (project of data.projects; track project.id) {
              <mat-option [value]="project.id">{{ project.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Team lead</mat-label>
          <mat-select formControlName="leadId">
            <mat-option value="">Unassigned</mat-option>
            @for (user of data.users; track user.id) {
              <mat-option [value]="user.id">{{ user.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Description</mat-label>
          <textarea matInput rows="2" formControlName="description"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Members</mat-label>
          <mat-select formControlName="memberIds" multiple>
            @for (user of data.users; track user.id) {
              <mat-option [value]="user.id">{{ user.name }} · {{ label(user.role.name) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ data.team ? 'Save changes' : 'Create team' }}
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
        min-width: 560px;
      }
      .span-2 {
        grid-column: span 2;
      }
      @media (max-width: 640px) {
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
export class TeamFormDialog {
  readonly label = label;
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    projectId: [''],
    leadId: [''],
    description: [''],
    memberIds: [[] as string[]],
  });

  constructor(
    readonly dialogRef: MatDialogRef<TeamFormDialog, TeamPayload | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: { team?: Team; projects: Project[]; users: User[] },
  ) {
    if (data.team) {
      this.form.patchValue({
        name: data.team.name,
        projectId: data.team.project?.id ?? '',
        leadId: data.team.lead?.id ?? '',
        description: data.team.description ?? '',
        memberIds: data.team.members.map((m) => m.user.id),
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      name: raw.name,
      description: raw.description || null,
      projectId: raw.projectId || null,
      leadId: raw.leadId || null,
      memberIds: raw.memberIds,
    });
  }
}

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PageHeader,
    EmptyState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Teams" subtitle="Group people around the work that matters.">
      @if (canManage()) {
        <button mat-flat-button color="primary" (click)="openForm()">
          <mat-icon>group_add</mat-icon>
          New team
        </button>
      }
    </app-page-header>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="44"></mat-spinner></div>
    } @else if (teams().length) {
      <div class="team-grid">
        @for (team of teams(); track team.id) {
          <mat-card class="card-surface team-card" appearance="outlined">
            <mat-card-header>
              <div class="team-head">
                <mat-icon class="team-icon">groups</mat-icon>
                <div>
                  <mat-card-title>{{ team.name }}</mat-card-title>
                  <mat-card-subtitle>{{ team.project?.name || 'No project' }}</mat-card-subtitle>
                </div>
              </div>
              @if (canManage()) {
                <div class="team-actions">
                  <button mat-icon-button matTooltip="Edit" (click)="openForm(team)">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button matTooltip="Delete" (click)="remove(team)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </mat-card-header>
            <mat-card-content>
              @if (team.description) {
                <p class="text-muted team-desc">{{ team.description }}</p>
              }
              <div class="lead">
                <span class="lead-avatar">{{ initials(team.lead?.name) }}</span>
                <span>Lead: <strong>{{ team.lead?.name || 'Unassigned' }}</strong></span>
              </div>
              <div class="members">
                <span class="members-label">{{ team.members.length }} members</span>
                <div class="avatar-stack">
                  @for (member of team.members; track member.id) {
                    <span class="avatar" [matTooltip]="member.user.name">{{ initials(member.user.name) }}</span>
                  }
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    } @else {
      <mat-card class="card-surface" appearance="outlined">
        <app-empty-state icon="groups" title="No teams yet" message="Create a team to start assigning work." />
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
      .team-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }
      .team-card mat-card-header {
        display: flex;
        justify-content: space-between;
      }
      .team-head {
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .team-icon {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        background: #eef2ff;
        color: #4f46e5;
      }
      .team-actions {
        margin-left: auto;
      }
      .team-desc {
        margin: 0 0 12px;
        line-height: 1.5;
      }
      .lead {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        font-size: 0.88rem;
      }
      .lead-avatar,
      .avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: #4f46e5;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 0.7rem;
        font-weight: 600;
      }
      .members {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .members-label {
        font-size: 0.8rem;
        color: #64748b;
      }
      .avatar-stack {
        display: flex;
      }
      .avatar-stack .avatar {
        margin-left: -8px;
        border: 2px solid #fff;
        background: #0ea5e9;
      }
      .avatar-stack .avatar:first-child {
        margin-left: 0;
      }
    `,
  ],
})
export class Teams implements OnInit {
  private readonly teamsService = inject(TeamService);
  private readonly projectsService = inject(ProjectService);
  private readonly usersService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(NotificationToastService);
  private readonly auth = inject(AuthService);

  readonly loading = signal(true);
  readonly teams = signal<Team[]>([]);
  private projects: Project[] = [];
  private users: User[] = [];

  initials = initials;

  ngOnInit(): void {
    this.load();
  }

  canManage(): boolean {
    return this.auth.isManager();
  }

  openForm(team?: Team): void {
    const ref = this.dialog.open(TeamFormDialog, {
      data: { team, projects: this.projects, users: this.users },
      width: '680px',
    });
    ref.afterClosed().subscribe((payload) => {
      if (!payload) return;
      const request = team ? this.teamsService.update(team.id, payload) : this.teamsService.create(payload);
      request.subscribe({
        next: () => {
          this.toast.success(team ? 'Team updated' : 'Team created');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  remove(team: Team): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Delete team',
        message: `Delete "${team.name}"? Members will be unassigned from this team.`,
        confirmText: 'Delete',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.teamsService.remove(team.id).subscribe({
        next: () => {
          this.toast.success('Team deleted');
          this.load();
        },
        error: (error) => this.toast.error(extractErrorMessage(error)),
      });
    });
  }

  private load(): void {
    this.loading.set(true);
    this.teamsService.list({ limit: 100 }).subscribe({
      next: (res) => {
        this.teams.set(res.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(extractErrorMessage(error));
      },
    });

    this.projectsService.list({ limit: 100 }).subscribe({ next: (res) => (this.projects = res.data) });
    this.usersService.list({ limit: 100 }).subscribe({ next: (res) => (this.users = res.data) });
  }
}
