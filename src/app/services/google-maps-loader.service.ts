import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

declare global {
  interface Window {
    google?: any;
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadPromise: Promise<typeof window.google> | null = null;

  /**
   * Loads the Google Maps JS SDK (with Places + Geocoding libraries) once,
   * and resolves with the global `google` namespace. Subsequent calls return
   * the same promise.
   */
  load(): Promise<typeof window.google> {
    if (window.google?.maps) return Promise.resolve(window.google);
    if (this.loadPromise) return this.loadPromise;

    const key = environment.googleMaps.apiKey;
    if (!key || key.startsWith('YOUR_')) {
      return Promise.reject(
        new Error(
          'Google Maps API key is not configured. Set environment.googleMaps.apiKey in src/environments/environment.ts'
        )
      );
    }

    this.loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        key
      )}&libraries=places,geometry&loading=async&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error('Failed to load Google Maps SDK'));
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }
}
