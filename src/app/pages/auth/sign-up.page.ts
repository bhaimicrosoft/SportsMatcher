import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sign-up',
  standalone: false,
  templateUrl: './sign-up.page.html'
})
export class SignUpPage {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  showPassword = false;

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, email, password } = this.form.getRawValue();
    const loading = await this.loadingCtrl.create({ message: 'Creating account…' });
    await loading.present();
    try {
      await this.auth.signUp(email, password, name);
      await loading.dismiss();

      const bioAvailable = await this.auth.isBiometricAvailable();
      if (bioAvailable) {
        const alert = await this.alertCtrl.create({
          header: 'Quick sign-in next time?',
          message: 'Use FaceID or your fingerprint to sign in faster on this device.',
          buttons: [
            { text: 'Skip', role: 'cancel' },
            {
              text: 'Enable',
              handler: async () => {
                try {
                  await this.auth.enableBiometric(email, password);
                } catch {}
              }
            }
          ]
        });
        await alert.present();
        await alert.onDidDismiss();
      }

      this.router.navigateByUrl('/tabs/home');
    } catch (err: any) {
      await loading.dismiss();
      this.toast(this.friendlyError(err));
    }
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, position: 'bottom', color: 'dark' });
    await t.present();
  }

  private friendlyError(err: any): string {
    const code = err?.code as string | undefined;
    switch (code) {
      case 'auth/email-already-in-use':
        return 'That email is already registered. Try signing in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'auth/invalid-email':
        return 'That email looks invalid.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.';
      default:
        return err?.message ?? 'Something went wrong.';
    }
  }
}
