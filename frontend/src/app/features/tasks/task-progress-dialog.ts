import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { Task, TaskStatus } from '../../core/models/task.model';
import { TASK_STATUSES, label } from '../../shared/utils/display';

export interface ProgressDialogResult {
  status: TaskStatus;
  progress: number;
  comment?: string | null;
}

@Component({
  selector: 'app-task-progress-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Update progress</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-content">
        <p class="task-title">{{ data.task.title }}</p>
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            @for (s of statuses; track s) {
              <mat-option [value]="s">{{ label(s) }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <div class="slider-row">
          <span>Progress: <strong>{{ form.controls.progress.value }}%</strong></span>
          <mat-slider min="0" max="100" step="5" discrete>
            <input matSliderThumb formControlName="progress" />
          </mat-slider>
        </div>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Comment (optional)</mat-label>
          <textarea matInput rows="2" formControlName="comment"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit">Save update</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .dialog-content {
        min-width: 420px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .task-title {
        margin: 0 0 4px;
        font-weight: 600;
        color: #0f172a;
      }
      .slider-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
      }
      .slider-row mat-slider {
        width: 100%;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class TaskProgressDialog {
  readonly statuses = TASK_STATUSES;
  readonly label = label;
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    status: ['TODO' as TaskStatus, [Validators.required]],
    progress: [0, [Validators.min(0), Validators.max(100)]],
    comment: [''],
  });

  constructor(
    readonly dialogRef: MatDialogRef<TaskProgressDialog, ProgressDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: { task: Task },
  ) {
    this.form.patchValue({
      status: data.task.status,
      progress: data.task.progress,
      comment: '',
    });
  }

  save(): void {
    const raw = this.form.getRawValue();
    this.dialogRef.close({
      status: raw.status,
      progress: raw.progress,
      comment: raw.comment || null,
    });
  }
}
