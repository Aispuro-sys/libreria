/** Persistencia por usuario en localStorage. */

const USERS_KEY = "biblio_users_v1";
const CURRENT_KEY = "biblio_current_user_v1";

export function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const getUsers = () => loadJSON(USERS_KEY, []);
export const saveUsers = (u) => saveJSON(USERS_KEY, u);
export const getCurrentUserId = () => localStorage.getItem(CURRENT_KEY);
export const setCurrentUserId = (id) =>
  id ? localStorage.setItem(CURRENT_KEY, id) : localStorage.removeItem(CURRENT_KEY);

/** Claves namespaced por usuario: progress / favs / notes */
export const uKey = (uid, kind) => `biblio_${uid}_${kind}_v1`;

export const PALETTE = ["#0a0a0a", "#3a3a41", "#6f6f78", "#9b9ba2", "#52525b", "#232327"];

export function createUser(name, color) {
  const id = `u${Date.now().toString(36)}`;
  return { id, name: name.trim() || "Lector", color: color || PALETTE[0] };
}
