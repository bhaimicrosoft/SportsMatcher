import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Venue } from '../models/venue.model';
import { sportMeta } from '../models/sport.model';

@Component({
  selector: 'app-venue-card',
  standalone: false,
  template: `
    <button
      type="button"
      (click)="open.emit(venue)"
      class="w-full text-left rounded-[var(--radius-card)] bg-white dark:bg-slate-800/80 shadow-soft overflow-hidden flex active:scale-[.99] transition"
    >
      <div
        class="w-28 h-28 shrink-0 bg-slate-200 dark:bg-slate-700 bg-cover bg-center"
        [style.background-image]="venue.photoUrl ? 'url(' + venue.photoUrl + ')' : null"
      >
        <div *ngIf="!venue.photoUrl" class="w-full h-full flex items-center justify-center text-3xl">
          {{ primarySportMeta.emoji }}
        </div>
      </div>
      <div class="flex-1 p-3 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-slate-900 dark:text-white truncate">{{ venue.name }}</h3>
          <span
            *ngIf="venue.distanceMeters != null"
            class="text-xs font-medium text-brand-600 dark:text-brand-400 shrink-0"
          >{{ venue.distanceMeters | distance }}</span>
        </div>
        <p class="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{{ venue.address }}</p>
        <div class="flex items-center gap-2 mt-2 flex-wrap">
          <span
            *ngFor="let s of venue.sports"
            class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
          >{{ sportLabel(s) }}</span>
          <span
            *ngIf="venue.rating"
            class="ml-auto text-xs font-semibold text-amber-500 flex items-center gap-1"
          >
            <ion-icon name="star" class="text-amber-500"></ion-icon>
            {{ venue.rating.toFixed(1) }}
          </span>
        </div>
      </div>
    </button>
  `
})
export class VenueCardComponent {
  @Input({ required: true }) venue!: Venue;
  @Output() open = new EventEmitter<Venue>();

  get primarySportMeta() {
    return sportMeta(this.venue.sports[0] ?? 'tennis');
  }

  sportLabel(s: any) {
    return sportMeta(s).label;
  }
}
