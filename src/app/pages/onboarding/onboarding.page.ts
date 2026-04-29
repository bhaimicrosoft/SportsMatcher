import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-onboarding',
  standalone: false,
  templateUrl: './onboarding.page.html'
})
export class OnboardingPage {
  slides = [
    {
      emoji: '📍',
      title: 'Courts near you',
      body: 'We use your location to find the best playgrounds within minutes — pickleball, tennis, badminton and more.'
    },
    {
      emoji: '⚡',
      title: 'Book in seconds',
      body: 'Reserve a slot, invite your group, and get directions — all without leaving the app.'
    },
    {
      emoji: '🔐',
      title: 'Sign in with your face',
      body: 'Skip the password. Use FaceID or your fingerprint to jump straight back in.'
    }
  ];

  index = 0;

  constructor(private router: Router) {}

  next() {
    if (this.index < this.slides.length - 1) {
      this.index++;
    } else {
      this.router.navigateByUrl('/auth/sign-up');
    }
  }

  skip() {
    this.router.navigateByUrl('/auth/sign-in');
  }
}
