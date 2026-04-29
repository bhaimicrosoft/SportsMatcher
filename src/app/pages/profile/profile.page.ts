import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { UserProfile } from '../../models/user-profile.model';
import { Sport, SPORTS } from '../../models/sport.model';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.page.html'
})
export class ProfilePage implements OnInit {
  private auth = inject(AuthService);
  private bookings = inject(BookingService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  profile$: Observable<UserProfile | null> = this.auth.profile$;
  bookingCount$: Observable<number> = this.bookings
    .myBookings$()
    .pipe(map((b) => b.filter((x) => x.status !== 'cancelled').length));

  sports = SPORTS;
  biometricAvailable = false;
  biometricEnabled = false;

  async ngOnInit() {
    this.biometricAvailable = await this.auth.isBiometricAvailable();
    this.biometricEnabled = await this.auth.hasStoredBiometricCredentials();
  }

  initial(profile: UserProfile): string {
    return (profile.displayName || profile.email || '?').charAt(0).toUpperCase();
  }

  /** Combined count of favorite sports + favorite venues. */
  favoritesCount(profile: UserProfile): number {
    return (profile.favoriteSports?.length ?? 0) + (profile.favoriteVenues?.length ?? 0);
  }

  memberSince(profile: UserProfile): string {
    if (!profile.createdAt) return 'New player';
    try {
      return new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'New player';
    }
  }

  async toggleSportFavorite(profile: UserProfile, sport: Sport) {
    const fav = profile.favoriteSports ?? [];
    const next = fav.includes(sport) ? fav.filter((s) => s !== sport) : [...fav, sport];
    await this.auth.updateProfileFields({ favoriteSports: next });
  }

  isFav(profile: UserProfile, sport: Sport): boolean {
    return (profile.favoriteSports ?? []).includes(sport);
  }

  async toggleBiometric() {
    if (this.biometricEnabled) {
      await this.auth.disableBiometric();
      this.biometricEnabled = false;
      this.toast('Biometric sign-in disabled.');
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Enable biometric sign-in',
        message: 'Re-enter your password to securely store credentials for FaceID / fingerprint sign-in.',
        inputs: [{ name: 'password', type: 'password', placeholder: 'Password' }],
        buttons: [
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Enable',
            handler: async (data) => {
              const email = this.auth.currentUser?.email;
              if (!email || !data?.password) {
                this.toast('Password required.');
                return;
              }
              try {
                await this.auth.signIn(email, data.password);
                await this.auth.enableBiometric(email, data.password);
                this.biometricEnabled = true;
                this.toast('Biometric sign-in enabled.');
              } catch (err: any) {
                this.toast(err?.message ?? 'Could not enable biometric.');
              }
            }
          }
        ]
      });
      await alert.present();
    }
  }

  async signOut() {
    const alert = await this.alertCtrl.create({
      header: 'Sign out?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Sign out',
          role: 'destructive',
          handler: async () => {
            await this.auth.signOut();
            this.router.navigateByUrl('/auth/sign-in');
          }
        }
      ]
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2200, color: 'dark' });
    await t.present();
  }
}
