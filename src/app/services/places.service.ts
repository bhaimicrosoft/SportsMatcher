import { Injectable, inject } from '@angular/core';
import { GoogleMapsLoaderService } from './google-maps-loader.service';
import { GeoPoint, GeolocationService } from './geolocation.service';
import { Sport, sportMeta } from '../models/sport.model';
import { Venue } from '../models/venue.model';

export interface PlaceSuggestion {
  placeId: string;
  primary: string;
  secondary: string;
}

export interface ResolvedPoint extends GeoPoint {
  address: string;
}

@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly loader = inject(GoogleMapsLoaderService);
  private placesService: any = null;
  private autocompleteService: any = null;
  private autocompleteSessionToken: any = null;

  private async ensureService(): Promise<any> {
    if (this.placesService) return this.placesService;
    const google = await this.loader.load();
    // PlacesService requires a node (an HTMLDivElement is fine for headless use).
    const node = document.createElement('div');
    this.placesService = new google.maps.places.PlacesService(node);
    return this.placesService;
  }

  private async ensureAutocomplete(): Promise<any> {
    if (this.autocompleteService) return this.autocompleteService;
    const google = await this.loader.load();
    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.autocompleteSessionToken = new google.maps.places.AutocompleteSessionToken();
    return this.autocompleteService;
  }

  /**
   * Live "as-you-type" location suggestions from Google Places Autocomplete.
   * Reuses an AutocompleteSessionToken across keystrokes for cheaper billing.
   */
  async getLocationSuggestions(query: string): Promise<PlaceSuggestion[]> {
    if (!query || query.trim().length < 2) return [];
    const google = await this.loader.load();
    const svc = await this.ensureAutocomplete();
    return new Promise<PlaceSuggestion[]>((resolve, reject) => {
      svc.getPlacePredictions(
        {
          input: query.trim(),
          sessionToken: this.autocompleteSessionToken,
          types: ['geocode']
        },
        (predictions: any[] | null, status: string) => {
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
            return;
          }
          if (status !== google.maps.places.PlacesServiceStatus.OK) {
            reject(new Error(`Autocomplete failed: ${status}`));
            return;
          }
          resolve(
            (predictions ?? []).map((p) => ({
              placeId: p.place_id,
              primary: p.structured_formatting?.main_text ?? p.description ?? '',
              secondary: p.structured_formatting?.secondary_text ?? ''
            }))
          );
        }
      );
    });
  }

  /**
   * Resolve an Autocomplete suggestion to lat/lng + formatted address.
   * Ends the current session token so the next search starts fresh
   * (Google bills autocomplete + details together when sharing a token).
   */
  async resolvePoint(placeId: string): Promise<ResolvedPoint> {
    const google = await this.loader.load();
    const svc = await this.ensureService();
    const result = await new Promise<any>((resolve, reject) => {
      svc.getDetails(
        {
          placeId,
          fields: ['geometry', 'formatted_address', 'name'],
          sessionToken: this.autocompleteSessionToken
        },
        (r: any, status: string) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK) {
            reject(new Error(`Place lookup failed: ${status}`));
            return;
          }
          resolve(r);
        }
      );
    });
    // Rotate the session token after a successful resolve.
    this.autocompleteSessionToken = new google.maps.places.AutocompleteSessionToken();
    const lat = result.geometry?.location?.lat?.() ?? 0;
    const lng = result.geometry?.location?.lng?.() ?? 0;
    return {
      lat,
      lng,
      address: result.formatted_address ?? result.name ?? ''
    };
  }

  /**
   * Find nearby playgrounds/courts for the given sport. Uses Google Places
   * `nearbySearch` with a sport-specific keyword (e.g. "tennis court").
   */
  async searchNearby(
    center: GeoPoint,
    sport: Sport,
    radiusMeters = 8000
  ): Promise<Venue[]> {
    const google = await this.loader.load();
    const svc = await this.ensureService();
    const meta = sportMeta(sport);

    return new Promise<Venue[]>((resolve, reject) => {
      const request = {
        location: new google.maps.LatLng(center.lat, center.lng),
        radius: radiusMeters,
        keyword: meta.placesKeyword
      };
      svc.nearbySearch(request, (results: any[], status: string) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          // Empty result is not an error.
          if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
            return;
          }
          reject(new Error(`Places search failed: ${status}`));
          return;
        }
        const venues: Venue[] = (results ?? []).map((r) =>
          this.mapResultToVenue(r, sport, center)
        );
        venues.sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0));
        resolve(venues);
      });
    });
  }

  /** Search across multiple sports in parallel and dedupe by placeId. */
  async searchNearbyAllSports(
    center: GeoPoint,
    sports: Sport[],
    radiusMeters = 8000
  ): Promise<Venue[]> {
    const lists = await Promise.all(
      sports.map((s) => this.searchNearby(center, s, radiusMeters).catch(() => []))
    );
    const map = new Map<string, Venue>();
    lists.forEach((list, idx) => {
      const sport = sports[idx];
      for (const v of list) {
        const existing = map.get(v.placeId);
        if (existing) {
          if (!existing.sports.includes(sport)) existing.sports.push(sport);
        } else {
          map.set(v.placeId, { ...v, sports: [sport] });
        }
      }
    });
    return [...map.values()].sort(
      (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0)
    );
  }

  /** Fetch full details for a single place. */
  async getDetails(placeId: string): Promise<Venue | null> {
    const google = await this.loader.load();
    const svc = await this.ensureService();
    return new Promise<Venue | null>((resolve, reject) => {
      svc.getDetails(
        {
          placeId,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'rating',
            'user_ratings_total',
            'photos',
            'opening_hours',
            'price_level'
          ]
        },
        (r: any, status: string) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK) {
            if (status === google.maps.places.PlacesServiceStatus.NOT_FOUND) {
              resolve(null);
              return;
            }
            reject(new Error(`Place details failed: ${status}`));
            return;
          }
          resolve(this.mapResultToVenue(r, 'tennis'));
        }
      );
    });
  }

  private mapResultToVenue(r: any, sport: Sport, center?: GeoPoint): Venue {
    const lat = r.geometry?.location?.lat?.() ?? r.geometry?.location?.lat ?? 0;
    const lng = r.geometry?.location?.lng?.() ?? r.geometry?.location?.lng ?? 0;
    const photo = r.photos?.[0]?.getUrl?.({ maxWidth: 800, maxHeight: 600 });
    const venue: Venue = {
      placeId: r.place_id,
      name: r.name,
      address: r.formatted_address ?? r.vicinity ?? '',
      lat,
      lng,
      rating: r.rating,
      userRatingsTotal: r.user_ratings_total,
      sports: [sport],
      photoUrl: photo,
      isOpenNow: r.opening_hours?.isOpen?.() ?? r.opening_hours?.open_now,
      priceLevel: r.price_level
    };
    if (center) {
      venue.distanceMeters = GeolocationService.distanceMeters(center, { lat, lng });
    }
    return venue;
  }
}
