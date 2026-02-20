import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../services/AuthService.jsx";
import {
  clearToken,
  getStoredUser,
  getStoredUsername,
  getToken,
  isTokenExpired,
  setStoredUser,
  setStoredUserId,
  setStoredUsername,
  setToken,
} from "../services/tokenService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setTokenState] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydrate = async () => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    if (isTokenExpired(t)) {
      clearToken();
      setLoading(false);
      return;
    }
    setTokenState(t);
    const cachedUser = getStoredUser();
    if (cachedUser) setUser(cachedUser);
    try {
      const me = await getMe();
      setUser(me);
      setStoredUser(me);
      if (me?.username) setStoredUsername(me.username);
      if (me?.id != null) setStoredUserId(me.id);
    } catch {
      clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      logout();
      navigate("/login");
    };
    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
  }, []);

  const login = async ({ token: t, userId, username }) => {
    if (t) setToken(t);
    if (username) setStoredUsername(username);
    if (userId != null) setStoredUserId(userId);
    setTokenState(t || null);
    try {
      const me = await getMe();
      setUser(me);
      setStoredUser(me);
      if (me?.username) setStoredUsername(me.username);
      if (me?.id != null) setStoredUserId(me.id);
      return me;
    } catch {
      return null;
    }
  };

  const logout = () => {
    clearToken();
    setTokenState(null);
    setUser(null);
  };

  const username = user?.username || getStoredUsername();
  const isAuthed = !!token;
  const isAdmin = user?.role === "ADMIN";

  const value = useMemo(
    () => ({
      token,
      user,
      username,
      isAuthed,
      isAdmin,
      loading,
      login,
      logout,
      refreshMe: hydrate,
    }),
    [token, user, username, isAuthed, isAdmin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
