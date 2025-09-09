import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SessionResetService {
private readonly endpoint = '/chat/reset-session/';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document,
    private zone: NgZone
  ) {}

  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Register listeners outside Angular to avoid change detection work
    this.zone.runOutsideAngular(() => {
      // Tab close / refresh
      window.addEventListener('beforeunload', this.resetSession, { capture: true });

      // Mobile/iOS Safari backgrounding
      window.addEventListener('pagehide', this.resetSession, { capture: true });

      // User switches away from tab/app
      this.document.addEventListener('visibilitychange', () => {
        if (this.document.hidden) this.resetSession();
      });
    });
  }

  // Safe to call anytime
  resetSession = (): void => {
    try {
      // Prefer sendBeacon (works during unload)
      if ('sendBeacon' in navigator) {
        const blob = new Blob([], { type: 'text/plain' });
        navigator.sendBeacon(this.endpoint, blob);
        return;
      }
      // Fallback for older browsers
      void fetch(this.endpoint, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'auto-reset' }),
      });
    } catch {
      // swallow – best-effort during unload
    }
  };
}
