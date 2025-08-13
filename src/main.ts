/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAppInitializer } from '@angular/core';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

/** Simple theme loader (sync) */
export function loadTheme(theme: 'light' | 'dark') {
  const href = `assets/theme/${theme}.css`; // no leading slash -> works under subpaths
  const existing = document.getElementById('theme-style') as HTMLLinkElement | null;
  if (existing) { existing.href = href; return; }
  const link = document.createElement('link');
  link.id = 'theme-style';
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

bootstrapApplication(AppComponent, {
  providers: [
    ...appConfig.providers!,
    provideAppInitializer(() => loadTheme('light')),
  ],
}).catch(err => console.error('Bootstrap failed:', err));
