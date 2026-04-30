import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  updateProfile,
  User
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

import { UserProfile } from '../models/user-profile.model';
import { BiometricService } from './biometric.service';

const BIO_ENABLED_KEY = 'sm.biometric.enabled';

export class EmailNotVerifiedError extends Error {
  readonly code = 'auth/email-not-verified';
  constructor() {
    super('Please verify your email address before continuing.');
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly biometric = inject(BiometricService);

  readonly user$: Observable<User | null> = authState(this.auth);

  private readonly profileSubject = new BehaviorSubject<UserProfile | null>(null);
  readonly profile$ = this.profileSubject.asObservable();

  constructor() {
    this.user$.subscribe(async (user) => {
      if (!user) {
        this.profileSubject.next(null);
        return;
      }
      const profile = await this.loadOrCreateProfile(user);
      this.profileSubject.next(profile);
    });
  }

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  async signUp(email: string, password: string, displayName: string): Promise<User> {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    await this.upsertProfile(cred.user, { displayName });
    // Best-effort verification email at sign-up. If it fails (quota, template
    // misconfig), the user can resend from the profile page.
    try {
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.warn('Failed to send verification email at sign-up:', err);
    }
    return cred.user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return cred.user;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    // Disable biometric on sign-out so the next user's session can't be
    // unlocked by the previous user's enrolled biometry.
    await Preferences.remove({ key: BIO_ENABLED_KEY });
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  // ---------------- Email verification ----------------

  async sendVerificationEmail(): Promise<void> {
    const user = this.currentUser;
    if (!user) throw new Error('Sign in first to send a verification email.');
    await sendEmailVerification(user);
  }

  // emailVerified is cached locally; reload() pulls the fresh value from
  // the Firebase server after the user clicks the email link.
  async refreshVerificationStatus(): Promise<boolean> {
    const user = this.currentUser;
    if (!user) return false;
    const wasVerified = user.emailVerified;
    await reload(user);
    if (user.emailVerified && !wasVerified) {
      // The email_verified claim flipped server-side. Force a new ID token
      // so Firestore rules see the updated claim on the next request —
      // otherwise the cached token (TTL ~1h) still says email_verified=false
      // and writes get rejected with "Missing or insufficient permissions".
      await user.getIdToken(true);
    }
    return user.emailVerified;
  }

  async requireVerifiedEmail(): Promise<void> {
    const user = this.currentUser;
    if (!user) throw new Error('Sign in required.');
    if (!user.emailVerified) {
      await reload(user);
      if (user.emailVerified) {
        await user.getIdToken(true);
      }
    }
    if (!user.emailVerified) {
      throw new EmailNotVerifiedError();
    }
  }

  // ---------------- Biometric ----------------

  async isBiometricAvailable(): Promise<boolean> {
    return this.biometric.isAvailable();
  }

  async isBiometricEnabledOnDevice(): Promise<boolean> {
    const { value } = await Preferences.get({ key: BIO_ENABLED_KEY });
    return value === 'true';
  }

  // We store ONLY a boolean flag — never the password. Firebase persists the
  // auth session via its own secure storage; biometric is a UI-level second
  // factor that gates app access on launch.
  async enableBiometric(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('Sign in with your password before enabling biometric unlock.');
    }
    await this.biometric.authenticate('Confirm to enable biometric unlock');
    await Preferences.set({ key: BIO_ENABLED_KEY, value: 'true' });
  }

  async disableBiometric(): Promise<void> {
    await Preferences.remove({ key: BIO_ENABLED_KEY });
  }

  async unlockWithBiometric(): Promise<User> {
    const user = this.currentUser;
    if (!user) {
      throw new Error('Your session expired. Please sign in with your password.');
    }
    await this.biometric.authenticate('Unlock SportsMatcher');
    return user;
  }

  // ---------------- Profile ----------------

  private async loadOrCreateProfile(user: User): Promise<UserProfile> {
    const ref = doc(this.firestore, `users/${user.uid}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return this.upsertProfile(user);
  }

  private async upsertProfile(user: User, extras: Partial<UserProfile> = {}): Promise<UserProfile> {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? '',
      displayName: extras.displayName ?? user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      favoriteSports: extras.favoriteSports ?? [],
      favoriteVenues: extras.favoriteVenues ?? [],
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(this.firestore, `users/${user.uid}`), { ...profile, _serverTs: serverTimestamp() }, { merge: true });
    return profile;
  }

  async updateProfileFields(updates: Partial<UserProfile>): Promise<void> {
    const uid = this.currentUser?.uid;
    if (!uid) return;
    await setDoc(doc(this.firestore, `users/${uid}`), updates, { merge: true });
    const current = await firstValueFrom(this.profile$);
    if (current) {
      this.profileSubject.next({ ...current, ...updates });
    }
  }
}
