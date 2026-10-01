import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { label, priorityClass, statusClass } from '../../utils/display';

type ChipKind = 'priority' | 'status' | 'neutral';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [ngClass]="cssClass">{{ text }}</span>`,
})
export class StatusChip {
  @Input({ required: true }) value!: string;
  @Input() kind: ChipKind = 'neutral';

  get text(): string {
    return label(this.value);
  }

  get cssClass(): string {
    if (this.kind === 'priority') return priorityClass(this.value);
    if (this.kind === 'status') return statusClass(this.value);
    return 'chip chip-neutral';
  }
}
