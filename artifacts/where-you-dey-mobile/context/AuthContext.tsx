import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
setBaseUrl(BASE_URL);

export type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  phone?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  setToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const TOKEN_KEY = "wyd_auth_token";

async function storeToken(t: string) {
  if (Platform.OS === "web") {
    try { localStorage.setItem(TOKEN_KEY, t); } catch {}
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
  }
}
async function loadToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}
async function deleteToken() {
  if (Platform.OS === "web") {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, isLoading: true,
  setToken: async () => {}, signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    tokenRef.current = token;
    setAuthTokenGetter(() => tokenRef.current);
  }, [token]);

  const fetchUser = async (tok: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/user`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user ?? null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      const stored = await loadToken();
      if (stored) {
        const u = await fetchUser(stored);
        if (u) {
          setTokenState(stored);
          setUser(u);
        } else {
          await deleteToken();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const setToken = async (tok: string) => {
    await storeToken(tok);
    setTokenState(tok);
    const u = await fetchUser(tok);
    setUser(u);
  };

  const signOut = async () => {
    const tok = tokenRef.current;
    await deleteToken();
    setTokenState(null);
    setUser(null);
    if (tok) {
      try {
        await fetch(`${BASE_URL}/api/auth/mobile-auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${tok}` },
        });
      } catch {}
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
