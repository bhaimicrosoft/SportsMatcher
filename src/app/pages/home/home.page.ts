import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

import { GeolocationService, GeoPoint } from '../../services/geolocation.service';
import { PlacesService, PlaceSuggestion } from '../../services/places.service';
import { GoogleMapsLoaderService } from '../../services/google-maps-loader.service';
import { AuthService } from '../../services/auth.service';
import { Sport, SPORTS } from '../../models/sport.model';
import { Venue } from '../../models/venue.model';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapEl', { static: false }) mapEl!: ElementRef<HTMLDivElement>;
  @ViewChild('locationInput') locationInput?: ElementRef<HTMLInputElement>;

  private geo = inject(GeolocationService);
  private places = inject(PlacesService);
  private mapsLoader = inject(GoogleMapsLoaderService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);

  sports = SPORTS;
  selectedSport: Sport = 'pickleball';
  loading = false;
  venues: Venue[] = [];
  userPoint: GeoPoint | null = null;
  greeting = 'Hi there';

  // Location search state
  locationLabel = 'Current location';
  searchOpen = false;
  searchQuery = '';
  suggestions: PlaceSuggestion[] = [];
  suggestionsLoading = false;

  private map: any = null;
  private markers: any[] = [];
  private userMarker: any = null;
  private readonly query$ = new Subject<string>();
  private querySub?: Subscription;

  async ngOnInit() {
    this.auth.profile$.subscribe((p) => {
      const name = p?.displayName?.split(' ')[0];
      this.greeting = name ? `Hi, ${name}` : 'Welcome';
    });

    this.querySub = this.query$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap(async (q) => {
          if (!q.trim()) return [];
          this.suggestionsLoading = true;
          try {
            return await this.places.getLocationSuggestions(q);
          } catch {
            return [];
          } finally {
            this.suggestionsLoading = false;
          }
        })
      )
      .subscribe((items) => (this.suggestions = items));
  }

  async ngAfterViewInit() {
    await this.loadAndSearch();
  }

  ngOnDestroy() {
    this.clearMarkers();
    this.querySub?.unsubscribe();
  }

  async loadAndSearch(forceRefreshLocation = false) {
    this.loading = true;
    try {
      this.userPoint = await this.geo.getCurrent(forceRefreshLocation);
      this.locationLabel = 'Current location';
      await this.initMap(this.userPoint);
      await this.searchSport(this.selectedSport);
    } catch (err: any) {
      this.toast(err?.message ?? 'Could not load nearby courts.');
    } finally {
      this.loading = false;
    }
  }

  async selectSport(sport: Sport) {
    if (this.selectedSport === sport) return;
    this.selectedSport = sport;
    await this.searchSport(sport);
  }

  async refresh(ev?: any) {
    await this.loadAndSearch(true);
    ev?.target?.complete?.();
  }

  selectedSportLabel(): string {
    return this.sports.find((s) => s.id === this.selectedSport)?.label ?? 'courts';
  }

  openVenue(venue: Venue) {
    this.router.navigate(['/venue', venue.placeId], {
      state: { venue, sport: this.selectedSport }
    });
  }

  // ---------------- Manual location search ----------------

  openLocationSearch() {
    this.searchOpen = true;
    this.searchQuery = '';
    this.suggestions = [];
    setTimeout(() => this.locationInput?.nativeElement.focus(), 50);
  }

  closeLocationSearch() {
    this.searchOpen = false;
    this.searchQuery = '';
    this.suggestions = [];
  }

  onSearchInput(value: string) {
    this.searchQuery = value;
    this.query$.next(value);
  }

  clearSearch() {
    this.searchQuery = '';
    this.suggestions = [];
    this.locationInput?.nativeElement.focus();
  }

  async useCurrentLocation() {
    this.closeLocationSearch();
    await this.loadAndSearch(true);
  }

  async selectSuggestion(s: PlaceSuggestion) {
    this.loading = true;
    this.searchOpen = false;
    try {
      const point = await this.places.resolvePoint(s.placeId);
      this.userPoint = { lat: point.lat, lng: point.lng };
      this.locationLabel = s.primary;
      await this.initMap(this.userPoint);
      await this.searchSport(this.selectedSport);
    } catch (err: any) {
      this.toast(err?.message ?? 'Could not select location.');
    } finally {
      this.loading = false;
    }
  }

  // ---------------- Map + venues ----------------

  private async searchSport(sport: Sport) {
    if (!this.userPoint) return;
    this.loading = true;
    try {
      this.venues = await this.places.searchNearby(this.userPoint, sport, 10000);
      this.renderMarkers();
    } catch (err: any) {
      this.toast(err?.message ?? 'Search failed.');
    } finally {
      this.loading = false;
    }
  }

  private async initMap(point: GeoPoint) {
    const google = await this.mapsLoader.load();
    if (!this.map) {
      this.map = new google.maps.Map(this.mapEl.nativeElement, {
        center: { lat: point.lat, lng: point.lng },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: false,
        gestureHandling: 'greedy',
        styles: this.mapStyles()
      });
    } else {
      this.map.setCenter({ lat: point.lat, lng: point.lng });
    }
    if (this.userMarker) this.userMarker.setMap(null);
    this.userMarker = new google.maps.Marker({
      position: { lat: point.lat, lng: point.lng },
      map: this.map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: '#0ea2ff',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3
      }
    });
  }

  private async renderMarkers() {
    if (!this.map) return;
    const google = await this.mapsLoader.load();
    this.clearMarkers();
    for (const v of this.venues) {
      const marker = new google.maps.Marker({
        position: { lat: v.lat, lng: v.lng },
        map: this.map,
        title: v.name,
        icon: {
          path: 'M12 2C7.6 2 4 5.6 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.4-3.6-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z',
          fillColor: '#0084e0',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1.6,
          anchor: new google.maps.Point(12, 22)
        }
      });
      marker.addListener('click', () => this.openVenue(v));
      this.markers.push(marker);
    }
    if (this.venues.length > 0 && this.userPoint) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: this.userPoint.lat, lng: this.userPoint.lng });
      this.venues.slice(0, 8).forEach((v) => bounds.extend({ lat: v.lat, lng: v.lng }));
      this.map.fitBounds(bounds, 64);
    }
  }

  private clearMarkers() {
    this.markers.forEach((m) => m.setMap(null));
    this.markers = [];
  }

  private async toast(message: string) {
    const t = await this.toastCtrl.create({ message, duration: 3000, color: 'dark' });
    await t.present();
  }

  private mapStyles(): any[] {
    return [
      { elementType: 'geometry', stylers: [{ color: '#f4f7fb' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#5b6b7d' }] },
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#cfeaff' }]
      }
    ];
  }
}
