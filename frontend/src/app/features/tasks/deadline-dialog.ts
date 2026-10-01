import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Task } from '../../core/models/task.model';
import { formatDate } from '../../shared/utils/display';

export interface DeadlineDialogResult {
  dueDate: string;
  comment?: string;
}

@Component({
  selector: 'app-deadline-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Extend deadline</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="dialog-content">
        <p class="task-title">{{ data.task.title }}</p>
        <p class="current">Current due date: <strong>{{ formatDate(data.task.dueDate) }}</strong></p>
        <mat-form-field appearance="outline">
          <mat-label>New due date</mat-label>
          <input matInput type="date" formControlName="dueDate" required />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Reason (optional)</mat-label>
          <textarea matInput rows="2" formControlName="comment"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid">Update deadline</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [
    `
      .dialog-content {
        min-width: 420px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .task-title {
        margin: 0;
        font-weight: 600;
      }
      .current {
        margin: 0 0 8px;
        color: #64748b;
      }
    `,
  ],
})
export class DeadlineDialog {
  private readonly fb = inject(FormBuilder);
  readonly formatDate = formatDate;

  readonly form = this.fb.nonNullable.group({
    dueDate: ['', [Validators.required]],
    comment: [''],
  });

  constructor(
    readonly dialogRef: MatDialogRef<DeadlineDialog, DeadlineDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) readonly data: { task: Task },
  ) {}

  save(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    this.dialogRef.close({ dueDate: raw.dueDate, comment: raw.comment || undefined });
  }
}
