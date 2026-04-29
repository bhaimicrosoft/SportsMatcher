import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: false,
  templateUrl: './sign-in.page.html'
})
export class SignInPage implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  showPassword = false;
  biometricAvailable = false;
  hasBiometricCreds = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async ngOnInit() {
    this.biometricAvailable = await this.auth.isBiometricAvailable();
    this.hasBiometricCreds = await this.auth.hasStoredBiometricCredentials();
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    const loading = await this.loadingCtrl.create({ message: 'Signing in…' });
    await loading.present();
    try {
      await this.auth.signIn(email, password);
      await loading.dismiss();
      if (this.biometricAvailable && !this.hasBiometricCreds) {
        await this.offerBiometric(email, password);
      }
      this.router.navigateByUrl('/tabs/home');
    } catch (err: any) {
      await loading.dismiss();
      this.toast(this.friendlyError(err));
    }
  }

  async signInBiometric() {
    try {
      await this.auth.signInWithBiometric();
      this.router.navigateByUrl('/tabs/home');
    } catch (err: any) {
      this.toast(this.friendlyError(err));
    }
  }

  async forgotPassword() {
    const email = this.form.controls.email.value;
    if (!email) {
      this.toast('Enter your email above first.');
      return;
    }
    try {
      await this.auth.resetPassword(email);
      this.toast('Password reset email sent.');
    } catch (err: any) {
      this.toast(this.friendlyError(err));
    }
  }

  private async offerBiometric(email: string, password: string) {
    const alert = await this.alertCtrl.create({
      header: 'Enable biometric sign-in?',
      message: 'Use FaceID or your fingerprint to skip the password next time.',
      buttons: [
        { text: 'Not now', role: 'cancel' },
        {
          text: 'Enable',
          handler: async () => {
            try {
              await this.auth.enableBiometric(email, password);
              this.toast('Biometric sign-in enabled.');
            } catch {
              this.toast('Biometric setup cancelled.');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 2400, position: 'bottom', color: 'dark' });
    await t.present();
  }

  private friendlyError(err: any): string {
    const code = err?.code as string | undefined;
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Email or password is incorrect.';
      case 'auth/user-not-found':
        return "We couldn't find an account with that email.";
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again in a moment.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection.';
      default:
        return err?.message ?? 'Something went wrong.';
    }
  }
}
