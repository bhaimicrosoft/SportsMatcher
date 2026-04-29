import { Component, OnInit, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';

import { BookingService } from '../../services/booking.service';
import { Booking } from '../../models/booking.model';
import { sportMeta } from '../../models/sport.model';

interface BookingGroup {
  label: string;
  items: Booking[];
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

  groups$!: Observable<BookingGroup[]>;
  loading = true;

  ngOnInit() {
    this.groups$ = this.bookings.myBookings$().pipe(
      map((items) => {
        this.loading = false;
        return this.groupBookings(items);
      })
    );
  }

  sportLabel(s: any) {
    return sportMeta(s).label;
  }

  sportEmoji(s: any) {
    return sportMeta(s).emoji;
  }

  formatTime(iso: string) {
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
      message: `${b.venueName} · ${this.formatTime(b.startsAt)}`,
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

  private groupBookings(items: Booking[]): BookingGroup[] {
    const now = Date.now();
    const upcoming: Booking[] = [];
    const past: Booking[] = [];
    for (const b of items) {
      const end = new Date(b.startsAt).getTime() + b.durationMinutes * 60_000;
      if (b.status !== 'cancelled' && end >= now) upcoming.push(b);
      else past.push(b);
    }
    upcoming.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
    const groups: BookingGroup[] = [];
    if (upcoming.length) groups.push({ label: 'Upcoming', items: upcoming });
    if (past.length) groups.push({ label: 'Past', items: past });
    return groups;
  }
}
