import { Sport } from './sport.model';

export interface Venue {
  /** Google Places `place_id` — used as our stable venue identifier. */
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  userRatingsTotal?: number;
  /** Distance from user in meters, computed client-side. */
  distanceMeters?: number;
  /** Sports inferred from the user's current filter. */
  sports: Sport[];
  photoUrl?: string;
  isOpenNow?: boolean;
  priceLevel?: number;
}
