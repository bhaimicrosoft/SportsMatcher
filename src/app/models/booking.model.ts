import { Sport } from './sport.model';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Booking {
  id?: string;
  userId: string;
  venuePlaceId: string;
  venueName: string;
  venueAddress: string;
  sport: Sport;
  /** ISO 8601 datetime — start of the slot. */
  startsAt: string;
  /** Duration in minutes (30, 60, 90, 120). */
  durationMinutes: number;
  /** How many courts requested. */
  courts: number;
  /** Optional party size. */
  players: number;
  status: BookingStatus;
  notes?: string;
  createdAt: string;
}
