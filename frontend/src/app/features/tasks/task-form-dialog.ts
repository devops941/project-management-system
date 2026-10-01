import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Project } from '../../core/models/project.model';
import { Task, TaskPayload, TaskStatus } from '../../core/models/task.model';
import { User } from '../../core/models/user.model';
import { PRIORITIES, TASK_STATUSES, label } from '../../shared/utils/display';

@Component({
  selector: 'app-task-form-dialog',
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
    <h2 mat-dialog-title>{{ data.task ? 'Edit task' : 'New task' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Task title</mat-label>
          <input matInput formControlName="title" required />
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Description</mat-label>
          <textarea matInput rows="3" formControlName="description"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Project</mat-label>
          <mat-select formControlName="projectId" required>
            @for (project of data.projects; track project.id) {
              <mat-option [value]="project.id">{{ project.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Due date</mat-label>
          <input matInput type="date" formControlName="dueDate" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Priority</mat-label>
          <mat-select formControlName="priority">
            @for (p of priorities; track p) {
              <mat-option [value]="p">{{ label(p) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ label(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Assignees</mat-label>
          <mat-select formControlName="assigneeIds" multiple>
            @for (user of data.users; track user.id) {
              <mat-option [value]="user.id">{{ user.name }} · {{ label(user.role.name) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">
          {{ data.task ? 'Save changes' : 'Create task' }}
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
export class TaskFormDialog {
  readonly priorities = PRIORITIES;
  readonly statuses = TASK_STATUSES;
  readonly label = label;
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(160)]],
    description: [''],
    projectId: ['', [Validators.required]],
    dueDate: [''],
    priority: ['MEDIUM' as never],
    status: ['TODO' as TaskStatus],
    assigneeIds: [[] as string[]],
  });

  constructor(
    readonly dialogRef: MatDialogRef<TaskFormDialog, TaskPayload | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: { task?: Task; projects: Project[]; users: User[] },
  ) {
    if (data.task) {
      const t = data.task;
      this.form.patchValue({
        title: t.title,
        description: t.description ?? '',
        projectId: t.project.id,
        dueDate: t.dueDate ? t.dueDate.slice(0, 10) : '',
        priority: t.priority as never,
        status: t.status,
        assigneeIds: t.assignments.map((a) => a.user.id),
      });
    } else if (data.projects.length === 1) {
      this.form.patchValue({ projectId: data.projects[0].id });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      title: raw.title,
      description: raw.description || null,
      projectId: raw.projectId,
      dueDate: raw.dueDate || null,
      priority: raw.priority as never,
      status: raw.status,
      assigneeIds: raw.assigneeIds,
    });
  }
}
