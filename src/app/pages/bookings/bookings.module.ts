import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { BookingsPage } from './bookings.page';

const routes: Routes = [{ path: '', component: BookingsPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [BookingsPage]
})
export class BookingsPageModule {}
