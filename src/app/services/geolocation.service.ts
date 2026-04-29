import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

@Injectable({ providedIn: 'root' })
export class GeolocationService {
  private cached: GeoPoint | null = null;

  /**
   * Best-effort current position. Uses Capacitor on native; falls back to the
   * browser geolocation API on web. Returns the cached value if a fresh
   * lookup fails.
   */
  async getCurrent(forceFresh = false): Promise<GeoPoint> {
    if (!forceFresh && this.cached) return this.cached;
    try {
      if (Capacitor.isNativePlatform()) {
        await Geolocation.requestPermissions();
      }
      const pos: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10_000
      });
      this.cached = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyMeters: pos.coords.accuracy
      };
      return this.cached;
    } catch (err) {
      if (this.cached) return this.cached;
      throw err;
    }
  }

  /** Haversine distance in meters between two points. */
  static distanceMeters(a: GeoPoint, b: GeoPoint): number {
    const R = 6_371_000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
}
