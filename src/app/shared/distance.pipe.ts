import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'distance', standalone: false })
export class DistancePipe implements PipeTransform {
  transform(meters: number | undefined | null): string {
    if (meters == null) return '';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
  }
}
