import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  getDocs,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

import { Booking, BookingStatus } from '../models/booking.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  /** Live stream of the current user's bookings, newest first. */
  myBookings$(): Observable<Booking[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return new Observable<Booking[]>((sub) => sub.next([]));
    const ref = collection(this.firestore, 'bookings');
    const q = query(ref, where('userId', '==', uid), orderBy('startsAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Booking[]>;
  }

  /** Bookings for a venue + sport that overlap a given window. */
  async findConflicts(
    venuePlaceId: string,
    startsAt: Date,
    durationMinutes: number
  ): Promise<Booking[]> {
    const startIso = startsAt.toISOString();
    const endIso = new Date(
      startsAt.getTime() + durationMinutes * 60_000
    ).toISOString();
    const ref = collection(this.firestore, 'bookings');
    // Same-day prefilter; overlap check done client-side.
    const dayStart = new Date(startsAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(startsAt);
    dayEnd.setHours(23, 59, 59, 999);
    const q = query(
      ref,
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

    const conflicts = await this.findConflicts(
      booking.venuePlaceId,
      new Date(booking.startsAt),
      booking.durationMinutes
    );
    if (conflicts.length >= 3) {
      // Soft cap: 3 concurrent bookings per venue+slot. Tune as needed.
      throw new Error('This time slot is already fully booked at this venue.');
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
