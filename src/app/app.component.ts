import { Component, OnInit } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false
})
export class AppComponent implements OnInit {
  async ngOnInit() {
    if (!Capacitor.isNativePlatform()) return;
    // Give the first frame a tick to paint, then fade the native splash.
    setTimeout(() => {
      SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
    }, 250);
  }
}
