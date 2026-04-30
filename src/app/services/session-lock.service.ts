import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SessionLockState = 'evaluating' | 'locked' | 'unlocked';

@Injectable({ providedIn: 'root' })
export class SessionLockService {
  // 'evaluating' on first paint so the UI is covered until we know whether
  // a biometric unlock is required. If we revealed the router-outlet first
  // and locked over it, an attacker could glimpse session content.
  private readonly _state = new BehaviorSubject<SessionLockState>('evaluating');
  readonly state$ = this._state.asObservable();

  setState(state: SessionLockState): void {
    this._state.next(state);
  }

  get state(): SessionLockState {
    return this._state.value;
  }
}
