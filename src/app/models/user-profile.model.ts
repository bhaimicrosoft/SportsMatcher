import { Sport } from './sport.model';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  favoriteSports?: Sport[];
  favoriteVenues?: string[];
  biometricEnabled?: boolean;
  createdAt: string;
}
