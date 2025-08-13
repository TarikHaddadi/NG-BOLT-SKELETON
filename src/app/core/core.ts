import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  inject,
  EnvironmentInjector,
} from '@angular/core';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideAppInitializer } from '@angular/core';
import { MatNativeDateModule } from '@angular/material/core';

import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { Store } from '@ngrx/store';
import * as Auth from '@store/features/auth/auth.actions';

import { ConfigService } from './services/config.service';
import { KeycloakService } from './services/keycloak.service';
import { authInterceptor } from './interceptors/auth.interceptor';
import { httpErrorInterceptor } from './interceptors/http-error.interceptor';
import { CoreOptions } from './interfaces/core.interface';
import { APP_DATE_PROVIDERS } from './services/date-formats';

function loadTheme(theme: 'light' | 'dark' = 'light') {
  const href = `assets/theme/${theme}.css`;
  const existing = document.getElementById('theme-style') as HTMLLinkElement | null;
  if (existing) { existing.href = href; return; }
  const link = document.createElement('link');
  link.id = 'theme-style';
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function provideCore(opts: CoreOptions = {}): EnvironmentProviders {
  const extra = opts.interceptors ?? [];

  return makeEnvironmentProviders([
    // Singletons
    ConfigService,
    KeycloakService,

    // Angular Material date providers
    MatNativeDateModule,
    ...APP_DATE_PROVIDERS,

    // HttpClient with curated interceptor order: auth -> (extras) -> error
    provideHttpClient(
      withInterceptors([authInterceptor, ...extra, httpErrorInterceptor])
    ),

    // i18n
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: opts.i18n?.prefix ?? 'assets/i18n/',
        suffix: opts.i18n?.suffix ?? '.json',
      }),
      fallbackLang: opts.i18n?.fallbackLang ?? 'en',
      lang: opts.i18n?.lang ?? 'en',
    }),

    // Initializers (modern, non-deprecated)
    provideAppInitializer(() => loadTheme(opts.theme ?? 'light')),

    provideAppInitializer(() => {
      const env = inject(EnvironmentInjector);

      // ✅ Resolve all deps synchronously, before any await
      const config = env.get(ConfigService);
      const kc = env.get(KeycloakService);
      const store = env.get(Store);

      // Now do the async sequence
      return (async () => {
        await config.loadConfig();
        await kc.init();
        store.dispatch(Auth.hydrateFromKc());
      })();
    })
  ]);
}
