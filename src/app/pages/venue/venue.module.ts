import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { VenuePage } from './venue.page';

const routes: Routes = [{ path: '', component: VenuePage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [VenuePage]
})
export class VenuePageModule {}
