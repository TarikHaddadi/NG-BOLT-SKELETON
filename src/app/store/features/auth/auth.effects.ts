import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, interval, of } from 'rxjs';
import { catchError, filter, map, mergeMap, tap } from 'rxjs/operators';
import * as Auth from './auth.actions';
import { KeycloakService } from '@core/services/keycloak.service';
import { AuthProfile } from '@core/interfaces/keycloack.model';

// 1) Hydrate store from Keycloak (triggered once after init by provideCore)
export const hydrateFromKc = createEffect(
  () => {
    const actions$ = inject(Actions);
    const kc = inject(KeycloakService);

    return actions$.pipe(
      ofType(Auth.hydrateFromKc),
      map(() => {
        const inst = kc.instance;
        if (!inst?.authenticated) return Auth.authError({ error: 'not_authenticated' });

        return Auth.loginSuccess({
          profile: (inst.tokenParsed as AuthProfile) || null,
          expiresAt: ((inst.tokenParsed?.exp as number) || 0) * 1000,
        });
      })
    );
  },
  { functional: true }
);

// 2) Login redirect (supports broker IdP hint)
export const loginRedirect = createEffect(
  () => {
    const actions$ = inject(Actions);
    const kc = inject(KeycloakService);

    return actions$.pipe(
      ofType(Auth.loginRedirect),
      tap(({ idpHint }) => { void kc.login(idpHint ? { idpHint } : undefined); })
    );
  },
  { functional: true, dispatch: false }
);

// 3) Logout (full redirect)
export const logout = createEffect(
  () => {
    const actions$ = inject(Actions);
    const kc = inject(KeycloakService);

    return actions$.pipe(
      ofType(Auth.logout),
      tap(() => { void kc.logout(window.location.origin); })
    );
  },
  { functional: true, dispatch: false }
);

// 4) Token refresh loop (every 20s; refresh if <60s left) -> updates store expiry
export const refreshLoop = createEffect(
  () => {
    const kc = inject(KeycloakService);

    return interval(20_000).pipe(
      mergeMap(() =>
        from(kc.ensureFreshToken(60)).pipe(
          map(token => {
            if (!token || !kc.instance?.authenticated) return null;
            return {
              refreshToken: kc.instance.refreshToken || null,
              expiresAt: ((kc.instance.tokenParsed?.exp as number) || 0) * 1000,
            };
          }),
          catchError(err => of({ error: err }))
        )
      ),
      filter((v): v is { refreshToken: string | null; expiresAt: number } => !!v && !('error' in v)),
      map(v => Auth.tokenRefreshed(v)),
      catchError(err => of(Auth.authError({ error: err })))
    );
  },
  { functional: true }
);
