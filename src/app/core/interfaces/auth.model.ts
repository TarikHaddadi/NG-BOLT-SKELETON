import { AuthProfile } from "./keycloack.model";


export interface AuthState {
  isAuthenticated: boolean;
  profile: AuthProfile | null;
  expiresAt: number | null; // epoch ms
}

export const initialAuthState: AuthState = {
  isAuthenticated: false,
  profile: null,
  expiresAt: null
};
