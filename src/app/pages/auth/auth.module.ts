import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { SignInPage } from './sign-in.page';
import { SignUpPage } from './sign-up.page';

const routes: Routes = [
  { path: 'sign-in', component: SignInPage },
  { path: 'sign-up', component: SignUpPage },
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' }
];

@NgModule({
  imports: [SharedModule, RouterModule.forChild(routes)],
  declarations: [SignInPage, SignUpPage]
})
export class AuthPageModule {}
