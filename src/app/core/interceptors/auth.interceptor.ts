import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import Keycloak from 'keycloak-js';
import { ConfigService, KeycloakService } from '@core/services';

const isPublic = (url: string) =>
  url.startsWith('/assets/') || /\/public(\/|$)/.test(url);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const kc   = inject(KeycloakService);
  const conf = inject(ConfigService);

  // ✅ Skip KC endpoints completely
  const kcBase = (kc.instance as Keycloak)?.authServerUrl as string | undefined;
  const isKeycloakUrl = !!kcBase && req.url.startsWith(kcBase);

  // Define your API origin(s) to decide when to re-login on 401
  const apiBase: string | undefined = conf.getAll()?.apiUrl;
  const isApiUrl = apiBase ? req.url.startsWith(apiBase) : new URL(req.url, location.origin).origin === location.origin;

  if (isPublic(req.url) || isKeycloakUrl) {
    return next(req);
  }

  return from(kc.ensureFreshToken(60)).pipe(
    switchMap(token => {
      const authReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;
      return next(authReq);
    }),
    catchError(err => {
      // ✅ Only force login on *API* 401s (not KC/CORS/others)
      if (isApiUrl && err?.status === 401) {
        void kc.login({ redirectUri: window.location.href });
      }
      throw err;
    })
  );
};
