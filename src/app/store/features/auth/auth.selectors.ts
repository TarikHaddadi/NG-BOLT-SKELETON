import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AuthState } from '../../../core/interfaces/auth.model';

export const selectAuth = createFeatureSelector<AuthState>('auth');

export const selectIsAuthenticated = createSelector(selectAuth, s => s.isAuthenticated);
export const selectProfile        = createSelector(selectAuth, s => s.profile);
export const selectExpiresAt      = createSelector(selectAuth, s => s.expiresAt);
