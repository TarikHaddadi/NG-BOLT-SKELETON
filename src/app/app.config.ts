import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAppStore } from '@cadai/pxs-ng-core/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    ...provideAppStore(),
    isDevMode()
      ? provideStoreDevtools({
          name: 'PSX-NG Store',
          maxAge: 50,          // time-travel depth
          trace: true,         // stack traces on actions (toggle in DevTools)
          logOnly: false,      // set true if you must restrict in prod
          // Optional: shrink noisy payloads
          actionSanitizer: (a) =>
            a.type?.startsWith('@ngrx/router-store') ? { ...a, payload: '[router]' } : a,
          stateSanitizer: (s) => s, // or strip huge slices for perf
        })
      : [],
  ],
};