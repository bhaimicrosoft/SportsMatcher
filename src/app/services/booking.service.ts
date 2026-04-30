import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  query,
  where,
  addDoc,
  updateDoc,
  getDocs
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Booking, BookingStatus } from '../models/booking.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /**
   * Live stream of the current user's bookings, newest first.
   * Sorts client-side so we don't need a composite (userId+startsAt)
   * Firestore index on day one.
   */
  myBookings$(): Observable<Booking[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return of([]);
    const ref = collection(this.firestore, 'bookings');
    const q = query(ref, where('userId', '==', uid));
    return (collectionData(q, { idField: 'id' }) as Observable<Booking[]>).pipe(
      map((items) =>
        [...items].sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt))
      ),
      catchError((err) => {
        console.error('Failed to load bookings from Firestore:', err);
        return of([] as Booking[]);
      })
    );
  }

  // Per-user duplicate guard: detects whether THIS user already has an
  // overlapping booking at the same venue. Rules enforce owner-only reads,
  // so we always include `userId == auth.uid`. True cross-user inventory
  // capacity moves to a Cloud Function in Phase 2 (Admin SDK bypasses rules).
  async findOwnConflicts(
    venuePlaceId: string,
    startsAt: Date,
    durationMinutes: number
  ): Promise<Booking[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return [];
    const startIso = startsAt.toISOString();
    const endIso = new Date(
      startsAt.getTime() + durationMinutes * 60_000
    ).toISOString();
    const ref = collection(this.firestore, 'bookings');
    const dayStart = new Date(startsAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startsAt);
    dayEnd.setHours(23, 59, 59, 999);
    const q = query(
      ref,
      where('userId', '==', uid),
      where('venuePlaceId', '==', venuePlaceId),
      where('startsAt', '>=', dayStart.toISOString()),
      where('startsAt', '<=', dayEnd.toISOString())
    );
    const snap = await getDocs(q);
    const same: Booking[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Booking) }));
    return same.filter((b) => {
      if (b.status === 'cancelled') return false;
      const bStart = new Date(b.startsAt).getTime();
      const bEnd = bStart + b.durationMinutes * 60_000;
      const newStart = new Date(startIso).getTime();
      const newEnd = new Date(endIso).getTime();
      return newStart < bEnd && newEnd > bStart;
    });
  }

  async createBooking(
    booking: Omit<Booking, 'id' | 'userId' | 'createdAt' | 'status'>
  ): Promise<string> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required to book a court.');
    // Defense in depth: Firestore rules also enforce email_verified, but
    // checking client-side gives a friendlier error than a permission-denied.
    await this.auth.requireVerifiedEmail();

    const conflicts = await this.findOwnConflicts(
      booking.venuePlaceId,
      new Date(booking.startsAt),
      booking.durationMinutes
    );
    if (conflicts.length > 0) {
      throw new Error('You already have a booking that overlaps this time slot at this venue.');
    }

    const ref = collection(this.firestore, 'bookings');
    const docRef = await addDoc(ref, {
      ...booking,
      userId: uid,
      status: 'confirmed' as BookingStatus,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  }

  async cancelBooking(id: string): Promise<void> {
    await updateDoc(doc(this.firestore, `bookings/${id}`), { status: 'cancelled' });
  }
}
