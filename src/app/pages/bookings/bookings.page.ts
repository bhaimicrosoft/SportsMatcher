import { Component, OnInit, inject } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';

import { BookingService } from '../../services/booking.service';
import { Booking } from '../../models/booking.model';
import { Sport, sportMeta } from '../../models/sport.model';

type TabId = 'upcoming' | 'past';

interface BookingStats {
  upcoming: number;
  past: number;
  total: number;
}

@Component({
  selector: 'app-bookings',
  standalone: false,
  templateUrl: './bookings.page.html'
})
export class BookingsPage implements OnInit {
  private bookings = inject(BookingService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  private readonly tabSubject = new BehaviorSubject<TabId>('upcoming');
  readonly tab$ = this.tabSubject.asObservable();
  loading = true;

  private bookings$!: Observable<Booking[]>;
  visible$!: Observable<Booking[]>;
  stats$!: Observable<BookingStats>;

  ngOnInit() {
    this.bookings$ = this.bookings.myBookings$().pipe(
      map((items) => {
        this.loading = false;
        return items;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.stats$ = this.bookings$.pipe(map((items) => this.computeStats(items)));

    this.visible$ = combineLatest([this.bookings$, this.tab$]).pipe(
      map(([items, tab]) => this.filterForTab(items, tab))
    );
  }

  setTab(tab: TabId) {
    this.tabSubject.next(tab);
  }

  get currentTab(): TabId {
    return this.tabSubject.value;
  }

  sportEmoji(s: Sport) {
    return sportMeta(s).emoji;
  }

  /** Tailwind classes for the colored stripe across the top of a card. */
  sportStripe(s: Sport): string {
    return {
      pickleball: 'from-emerald-400 to-emerald-600',
      tennis: 'from-amber-400 to-amber-600',
      badminton: 'from-violet-400 to-violet-600',
      basketball: 'from-orange-400 to-orange-600'
    }[s];
  }

  /** Tailwind classes for the sport "badge" (the rounded square with emoji). */
  sportBadge(s: Sport): string {
    return {
      pickleball:
        'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30',
      tennis: 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30',
      badminton: 'bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/30',
      basketball: 'bg-gradient-to-br from-orange-400 to-orange-600 shadow-orange-500/30'
    }[s];
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  formatFull(iso: string) {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  async cancel(b: Booking) {
    const alert = await this.alertCtrl.create({
      header: 'Cancel booking?',
      message: `${b.venueName} · ${this.formatFull(b.startsAt)}`,
      buttons: [
        { text: 'Keep', role: 'cancel' },
        {
          text: 'Cancel booking',
          role: 'destructive',
          handler: async () => {
            if (!b.id) return;
            try {
              await this.bookings.cancelBooking(b.id);
              const t = await this.toastCtrl.create({
                message: 'Booking cancelled.',
                duration: 2000,
                color: 'dark'
              });
              await t.present();
            } catch (err: any) {
              const t = await this.toastCtrl.create({
                message: err?.message ?? 'Failed to cancel.',
                duration: 2400,
                color: 'danger'
              });
              await t.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private computeStats(items: Booking[]): BookingStats {
    const now = Date.now();
    let upcoming = 0;
    let past = 0;
    for (const b of items) {
      if (b.status === 'cancelled') {
        past++;
        continue;
      }
      const end = new Date(b.startsAt).getTime() + b.durationMinutes * 60_000;
      if (end >= now) upcoming++;
      else past++;
    }
    return { upcoming, past, total: items.length };
  }

  private filterForTab(items: Booking[], tab: TabId): Booking[] {
    const now = Date.now();
    if (tab === 'upcoming') {
      return items
        .filter((b) => {
          if (b.status === 'cancelled') return false;
          const end = new Date(b.startsAt).getTime() + b.durationMinutes * 60_000;
          return end >= now;
        })
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    }
    return items
      .filter((b) => {
        if (b.status === 'cancelled') return true;
        const end = new Date(b.startsAt).getTime() + b.durationMinutes * 60_000;
        return end < now;
      })
      .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
  }
}
