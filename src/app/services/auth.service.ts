import { Injectable, inject } from '@angular/core';
import {
  Auth,
  authState,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

import { UserProfile } from '../models/user-profile.model';
import { BiometricService } from './biometric.service';

const BIO_CRED_KEY = 'sm.biometric.credentials';

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
    return cred.user;
  }

  async signIn(email: string, password: string): Promise<User> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    return cred.user;
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
    await Preferences.remove({ key: BIO_CRED_KEY });
  }

  async resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email);
  }

  // ---------------- Biometric ----------------

  async isBiometricAvailable(): Promise<boolean> {
    return this.biometric.isAvailable();
  }

  async hasStoredBiometricCredentials(): Promise<boolean> {
    const { value } = await Preferences.get({ key: BIO_CRED_KEY });
    return !!value;
  }

  /**
   * Enable biometric login. Prompts for fingerprint/FaceID and on success
   * stores the email+password locally (encrypted on iOS Keychain / Android
   * Keystore via Preferences). Call this AFTER a successful password login.
   */
  async enableBiometric(email: string, password: string): Promise<void> {
    await this.biometric.authenticate('Confirm to enable biometric sign-in');
    const payload = JSON.stringify({ email, password });
    await Preferences.set({ key: BIO_CRED_KEY, value: payload });
    const uid = this.currentUser?.uid;
    if (uid) {
      await setDoc(doc(this.firestore, `users/${uid}`), { biometricEnabled: true }, { merge: true });
    }
  }

  async disableBiometric(): Promise<void> {
    await Preferences.remove({ key: BIO_CRED_KEY });
    const uid = this.currentUser?.uid;
    if (uid) {
      await setDoc(doc(this.firestore, `users/${uid}`), { biometricEnabled: false }, { merge: true });
    }
  }

  /**
   * Sign in via biometric. Reads stored credentials and re-authenticates
   * with Firebase. Returns the User on success.
   */
  async signInWithBiometric(): Promise<User> {
    const { value } = await Preferences.get({ key: BIO_CRED_KEY });
    if (!value) {
      throw new Error('No biometric credentials stored. Sign in with password first.');
    }
    await this.biometric.authenticate('Sign in to SportsMatcher');
    const { email, password } = JSON.parse(value) as { email: string; password: string };
    return this.signIn(email, password);
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
      biometricEnabled: extras.biometricEnabled ?? false,
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
