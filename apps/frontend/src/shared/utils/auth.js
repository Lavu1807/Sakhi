const AUTH_TOKEN_KEY = "sakhi_auth_token";
const AUTH_USER_KEY = "sakhi_auth_user";
const STORAGE_PREFIX = "sakhi_";

export function saveAuthSession({ token, user }) {
  // Always clear stale user-scoped storage before persisting a new session.
  clearAllUserData();
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

export function getAuthUser() {
  const raw = localStorage.getItem(AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

/**
 * Clears ALL user-related data from localStorage and sessionStorage.
 * Uses prefix-matching so any future sakhi_* keys are automatically covered.
 * Must be called on logout AND before saving a new session on login.
 */
export function clearAllUserData() {
  const keysToRemove = [];

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);

    if (key && key.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));

  try {
    sessionStorage.clear();
  } catch {
    // sessionStorage may be unavailable in some environments.
  }
}
