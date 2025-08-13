import { ActionReducerMap } from '@ngrx/store';
import { userReducer } from './features/user/user.reducer';
import { authReducer } from './features/auth/auth.reducer';
import { teamManagementReducer } from './features/team-management/team-management.reducer';
import { AppState } from '@core/interfaces';
// Fulfill imports with new added items

// Fulfill MAP with new added items
export const AppReducers: ActionReducerMap<AppState> = {
  user: userReducer,
  teamManagement: teamManagementReducer,
  auth: authReducer
};
