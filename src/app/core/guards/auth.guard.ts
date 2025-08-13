import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { KeycloakService } from '@core/services';

export const authGuard: CanActivateFn = async () => {
  const kc = inject(KeycloakService);
  await firstValueFrom(kc.whenReady());
  return !!kc.instance?.authenticated;
};
