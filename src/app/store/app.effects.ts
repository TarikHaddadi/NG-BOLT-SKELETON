import * as UserEffects from "./features/user/user.effects";
import * as teamEffect from './features/team-management/team-management.effects';
import * as authEffects from "./features/auth/auth.effects";
// Fulfill imports with new added items

// Fulfill Array with new added items
export const AppEffects = [
    UserEffects,
    teamEffect,
    authEffects
];
