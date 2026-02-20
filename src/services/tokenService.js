const TOKEN_KEY = "token";
const USER_KEY = "user";
const USERNAME_KEY = "username";
const USER_ID_KEY = "userId";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

export function setStoredUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredUsername(username) {
  if (username) localStorage.setItem(USERNAME_KEY, username);
}

export function getStoredUsername() {
  return localStorage.getItem(USERNAME_KEY) || "";
}

export function setStoredUserId(userId) {
  if (userId != null) localStorage.setItem(USER_ID_KEY, String(userId));
}

export function getStoredUserId() {
  const v = localStorage.getItem(USER_ID_KEY);
  return v ? Number(v) : null;
}

export function getJwtPayload(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = getJwtPayload(token);
  if (!payload || !payload.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}
