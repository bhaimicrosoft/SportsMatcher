import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

@Injectable({ providedIn: 'root' })
export class BiometricService {
  /**
   * Returns true if the device has biometric hardware enrolled (FaceID,
   * fingerprint, etc.). On the web, falls back to false.
   */
  async isAvailable(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const info = await BiometricAuth.checkBiometry();
      return info.isAvailable;
    } catch {
      return false;
    }
  }

  async biometryType(): Promise<BiometryType> {
    if (!Capacitor.isNativePlatform()) return BiometryType.none;
    try {
      const info = await BiometricAuth.checkBiometry();
      return info.biometryType;
    } catch {
      return BiometryType.none;
    }
  }

  /**
   * Trigger the biometric prompt. Throws if cancelled / failed.
   */
  async authenticate(reason: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // On web we can't use real biometrics — pretend success so dev flow works.
      return;
    }
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      androidTitle: 'SportsMatcher',
      androidSubtitle: reason,
      androidConfirmationRequired: false,
      allowDeviceCredential: true
    });
  }
}
