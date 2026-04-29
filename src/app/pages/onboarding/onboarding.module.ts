import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { OnboardingPage } from './onboarding.page';

const routes: Routes = [{ path: '', component: OnboardingPage }];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [OnboardingPage]
})
export class OnboardingPageModule {}
