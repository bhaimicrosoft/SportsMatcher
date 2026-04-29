import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Sport, sportMeta } from '../models/sport.model';

@Component({
  selector: 'app-sport-chip',
  standalone: false,
  template: `
    <button
      type="button"
      (click)="select.emit(sport)"
      [attr.aria-pressed]="active"
      [class]="
        'w-full flex flex-col items-center justify-center gap-1 py-2 rounded-xl font-semibold transition-all duration-150 active:scale-[0.97] ' +
        (active
          ? 'bg-brand-500 text-white shadow-soft ring-2 ring-brand-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-600')
      "
    >
      <span class="text-xl leading-none">{{ meta.emoji }}</span>
      <span class="text-[11px] leading-tight whitespace-nowrap">{{ meta.label }}</span>
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
