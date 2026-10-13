import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { api } from "./api";
import type { Role } from "./types";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  siteId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("auth_token"),
    loading: true,
  });

  useEffect(() => {
    if (state.token) {
      api
        .get<{ user: AuthUser }>("/profile")
        .then(({ user }) => setState((s) => ({ ...s, user, loading: false })))
        .catch(() => {
          localStorage.removeItem("auth_token");
          setState({ user: null, token: null, loading: false });
        });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>(
      "/auth/login",
      { email, password },
    );
    localStorage.setItem("auth_token", token);
    setState({ user, token, loading: false });
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
  ) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>(
      "/auth/register",
      { email, password, fullName },
    );
    localStorage.setItem("auth_token", token);
    setState({ user, token, loading: false });
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setState({ user: null, token: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
