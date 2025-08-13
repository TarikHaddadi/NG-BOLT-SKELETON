import { UserState, TeamManagementState, AuthState } from "./";

export interface AppState {
  user: UserState;
  teamManagement: TeamManagementState,
  auth: AuthState
}