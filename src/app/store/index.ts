import { ActionReducer, MetaReducer, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { localStorageSync } from 'ngrx-store-localstorage';
import { AppEffects } from './app.effects';
import { AppReducers } from './app.reducer';
import { AppState } from '@core/interfaces';

const localStorageSyncReducer = (reducer: ActionReducer<AppState>): ActionReducer<AppState> =>
  localStorageSync({ keys: ['teamManagement'], rehydrate: true })(reducer);

export const metaReducers: MetaReducer[] = [localStorageSyncReducer];

export const provideAppStore = () => [
  provideStore(
    AppReducers,
    {
      metaReducers,
      runtimeChecks: {
        strictActionImmutability: true,
        strictStateImmutability: true
      }
    },),
  provideEffects(AppEffects),
];

