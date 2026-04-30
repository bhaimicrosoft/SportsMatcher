import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { firstValueFrom } from 'rxjs';

import { AuthService } from './services/auth.service';
import { SessionLockService } from './services/session-lock.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly lock = inject(SessionLockService);
  private readonly router = inject(Router);

  readonly state$ = this.lock.state$;

  async ngOnInit() {
    if (Capacitor.isNativePlatform()) {
      setTimeout(() => {
        SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
      }, 250);
    }
    await this.evaluateSessionLock();
  }

  // Cold-start lock check: if a Firebase session is persisted AND biometric
  // is enabled on this device, block the UI until the user passes the
  // biometric prompt. Never store passwords — Firebase manages the refresh
  // token; biometric only gates access.
  private async evaluateSessionLock() {
    const user = await firstValueFrom(this.auth.user$);
    if (!user) {
      this.lock.setState('unlocked');
      return;
    }
    const enabled = await this.auth.isBiometricEnabledOnDevice();
    if (!enabled) {
      this.lock.setState('unlocked');
      return;
    }
    this.lock.setState('locked');
    await this.runUnlockPrompt();
  }

  async retryUnlock() {
    await this.runUnlockPrompt();
  }

  async signOutFromLock() {
    await this.auth.signOut();
    this.lock.setState('unlocked');
    await this.router.navigateByUrl('/auth/sign-in');
  }

  private async runUnlockPrompt() {
    try {
      await this.auth.unlockWithBiometric();
      this.lock.setState('unlocked');
    } catch {
      // Stay locked. The user can tap retry or sign-out from the lock screen.
    }
  }
}
