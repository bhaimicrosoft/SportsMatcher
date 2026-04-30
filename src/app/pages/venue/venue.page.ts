import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController, ActionSheetController } from '@ionic/angular';
import { Share } from '@capacitor/share';

import { PlacesService } from '../../services/places.service';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { Venue } from '../../models/venue.model';
import { Sport, SPORTS, sportMeta } from '../../models/sport.model';

@Component({
  selector: 'app-venue',
  standalone: false,
  templateUrl: './venue.page.html',
  styleUrls: ['./venue.page.scss']
})
export class VenuePage implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private places = inject(PlacesService);
  private bookings = inject(BookingService);
  private auth = inject(AuthService);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);

  venue: Venue | null = null;
  loading = true;
  isFavorite = false;
  sports = SPORTS;

  // Booking form state
  selectedSport: Sport = 'pickleball';
  selectedDate: string = this.todayIso();
  selectedTime: string = this.defaultTimeIso();
  duration: 30 | 60 | 90 | 120 = 60;
  readonly durationOptions: Array<30 | 60 | 90 | 120> = [30, 60, 90, 120];
  courts = 1;
  players = 2;
  notes = '';
  submitting = false;

  async ngOnInit() {
    const placeId = this.route.snapshot.paramMap.get('placeId');
    if (!placeId) {
      this.router.navigateByUrl('/tabs/home');
      return;
    }

    // Pre-populate from router state if we have it (instant render).
    const navState = (this.router.getCurrentNavigation()?.extras?.state ??
      window.history.state) as { venue?: Venue; sport?: Sport } | null;
    if (navState?.venue) {
      this.venue = navState.venue;
      this.selectedSport = navState.sport ?? this.venue.sports[0] ?? 'pickleball';
      this.loading = false;
    }

    try {
      const fresh = await this.places.getDetails(placeId);
      if (fresh) {
        this.venue = { ...(this.venue ?? fresh), ...fresh, sports: this.venue?.sports ?? fresh.sports };
      }
    } catch {
      // best-effort enrichment
    } finally {
      this.loading = false;
    }

    this.auth.profile$.subscribe((p) => {
      this.isFavorite = !!p?.favoriteVenues?.includes(placeId);
    });
  }

  get sportMeta() {
    return sportMeta(this.selectedSport);
  }

  async toggleFavorite() {
    if (!this.venue) return;
    const profile = this.auth.profile$;
    const current = await new Promise<string[]>((resolve) =>
      profile.subscribe((p) => resolve(p?.favoriteVenues ?? [])).unsubscribe()
    );
    const placeId = this.venue.placeId;
    const next = current.includes(placeId)
      ? current.filter((p) => p !== placeId)
      : [...current, placeId];
    await this.auth.updateProfileFields({ favoriteVenues: next });
    this.isFavorite = next.includes(placeId);
  }

  async share() {
    if (!this.venue) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${this.venue.lat},${this.venue.lng}&query_place_id=${this.venue.placeId}`;
    try {
      await Share.share({
        title: this.venue.name,
        text: `Let's play at ${this.venue.name}`,
        url,
        dialogTitle: 'Share venue'
      });
    } catch {
      // ignore — user dismissed or unsupported
    }
  }

  openDirections() {
    if (!this.venue) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${this.venue.lat},${this.venue.lng}&destination_place_id=${this.venue.placeId}`;
    window.open(url, '_blank');
  }

  async submitBooking() {
    if (!this.venue) return;
    const startsAt = new Date(`${this.selectedDate}T${this.selectedTime}:00`);
    if (Number.isNaN(startsAt.getTime())) {
      this.toast('Pick a valid date and time.');
      return;
    }
    if (startsAt.getTime() < Date.now() - 5 * 60_000) {
      this.toast('Pick a time in the future.');
      return;
    }

    this.submitting = true;
    const loading = await this.loadingCtrl.create({ message: 'Booking your court…' });
    await loading.present();
    try {
      await this.bookings.createBooking({
        venuePlaceId: this.venue.placeId,
        venueName: this.venue.name,
        venueAddress: this.venue.address,
        sport: this.selectedSport,
        startsAt: startsAt.toISOString(),
        durationMinutes: this.duration,
        courts: this.courts,
        players: this.players,
        notes: this.notes
      });
      await loading.dismiss();
      const sheet = await this.actionSheetCtrl.create({
        header: 'Booking confirmed!',
        subHeader: `${this.venue.name} · ${this.formatHumanDate(startsAt)}`,
        buttons: [
          {
            text: 'View my bookings',
            handler: () => this.router.navigateByUrl('/tabs/bookings')
          },
          { text: 'Stay here', role: 'cancel' }
        ]
      });
      await sheet.present();
    } catch (err: any) {
      await loading.dismiss();
      if (err?.code === 'auth/email-not-verified') {
        await this.promptEmailVerification();
      } else {
        this.toast(err?.message ?? 'Could not complete booking.');
      }
    } finally {
      this.submitting = false;
    }
  }

  private async promptEmailVerification() {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Verify your email first',
      subHeader: 'Booking is locked until you confirm your email address.',
      buttons: [
        {
          text: 'Resend verification email',
          handler: async () => {
            try {
              await this.auth.sendVerificationEmail();
              this.toast('Verification email sent. Check your inbox.');
            } catch (err: any) {
              this.toast(err?.message ?? 'Could not send verification email.');
            }
          }
        },
        {
          text: "I've already verified",
          handler: async () => {
            const ok = await this.auth.refreshVerificationStatus();
            this.toast(ok ? 'Verified — try booking again.' : 'Still pending. Check your inbox.');
          }
        },
        { text: 'Cancel', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  private todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private defaultTimeIso(): string {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }

  private formatHumanDate(d: Date): string {
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, color: 'dark' });
    await t.present();
  }
}
