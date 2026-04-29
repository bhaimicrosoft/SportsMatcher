import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DistancePipe } from './distance.pipe';
import { SportChipComponent } from './sport-chip.component';
import { VenueCardComponent } from './venue-card.component';

const exported = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  IonicModule,
  DistancePipe,
  SportChipComponent,
  VenueCardComponent
];

@NgModule({
  declarations: [DistancePipe, SportChipComponent, VenueCardComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  exports: exported
})
export class SharedModule {}
