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
   * Loads the Google Maps JS SDK once and resolves with the global `google`
   * namespace.
   *
   * We use the classic `callback=` URL parameter rather than `loading=async`
   * + importLibrary(): Google only invokes the callback once `google.maps`
   * AND every library listed in `libraries=` is fully constructible, so by
   * the time the promise resolves it's safe to do `new google.maps.Map(...)`,
   * `new google.maps.places.PlacesService(...)`, etc. The async-loading path
   * has a documented race where the script tag's `onload` fires before the
   * library modules finish resolving.
   */
  load(): Promise<typeof window.google> {
    if (window.google?.maps?.Map) return Promise.resolve(window.google);
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
      const callbackName = '__smGoogleMapsLoaded__';
      (window as any)[callbackName] = () => {
        try {
          delete (window as any)[callbackName];
        } catch {
          /* non-configurable on some browsers — best effort */
        }
        if (window.google?.maps?.Map) {
          resolve(window.google);
        } else {
          reject(new Error('Google Maps loaded but constructors are missing.'));
        }
      };

      const script = document.createElement('script');
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}` +
        `&libraries=places,geometry&v=weekly&callback=${callbackName}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Failed to load Google Maps SDK'));
      document.head.appendChild(script);
    });
    return this.loadPromise;
  }
}
