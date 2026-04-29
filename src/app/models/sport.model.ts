export type Sport = 'pickleball' | 'tennis' | 'badminton' | 'basketball';

export interface SportMeta {
  id: Sport;
  label: string;
  icon: string;
  emoji: string;
  color: string;
  placesKeyword: string;
}

export const SPORTS: SportMeta[] = [
  {
    id: 'pickleball',
    label: 'Pickleball',
    icon: 'tennisball-outline',
    emoji: '🥒',
    color: 'var(--color-court-pickle)',
    placesKeyword: 'pickleball court'
  },
  {
    id: 'tennis',
    label: 'Tennis',
    icon: 'tennisball-outline',
    emoji: '🎾',
    color: 'var(--color-court-tennis)',
    placesKeyword: 'tennis court'
  },
  {
    id: 'badminton',
    label: 'Badminton',
    icon: 'tennisball-outline',
    emoji: '🏸',
    color: 'var(--color-court-badminton)',
    placesKeyword: 'badminton court'
  },
  {
    id: 'basketball',
    label: 'Basketball',
    icon: 'basketball-outline',
    emoji: '🏀',
    color: 'var(--color-court-basket)',
    placesKeyword: 'basketball court'
  }
];

export function sportMeta(id: Sport): SportMeta {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0];
}
