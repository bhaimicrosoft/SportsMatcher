import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Sport, sportMeta } from '../models/sport.model';

@Component({
  selector: 'app-sport-chip',
  standalone: false,
  template: `
    <button
      type="button"
      (click)="select.emit(sport)"
      [class]="
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition shrink-0 ' +
        (active
          ? 'bg-brand-500 text-white shadow-soft'
          : 'bg-white/70 text-slate-700 dark:bg-white/5 dark:text-slate-200 hover:bg-white')
      "
    >
      <span class="text-lg leading-none">{{ meta.emoji }}</span>
      <span>{{ meta.label }}</span>
    </button>
  `
})
export class SportChipComponent {
  @Input({ required: true }) sport!: Sport;
  @Input() active = false;
  @Output() select = new EventEmitter<Sport>();

  get meta() {
    return sportMeta(this.sport);
  }
}
