import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stat-card card-surface">
      <div class="stat-icon" [style.background]="tint">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <div class="stat-body">
        <span class="stat-value">{{ value }}</span>
        <span class="stat-label">{{ label }}</span>
        @if (hint) {
          <span class="stat-hint">{{ hint }}</span>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .stat-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 16px 18px;
      }
      .stat-icon {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        color: #fff;
      }
      .stat-body {
        display: flex;
        flex-direction: column;
        line-height: 1.2;
      }
      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
      }
      .stat-label {
        font-size: 0.82rem;
        color: #64748b;
      }
      .stat-hint {
        font-size: 0.72rem;
        color: #94a3b8;
        margin-top: 2px;
      }
    `,
  ],
})
export class StatCard {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() icon = 'insights';
  @Input() tint = '#4f46e5';
  @Input() hint?: string;
}
