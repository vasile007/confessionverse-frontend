const AVATAR_KEY_PREFIX = "cv_avatar_";

export const AVATAR_OPTIONS = [
  { id: "fox", icon: "\uD83E\uDD8A", label: "Fox" },
  { id: "cat", icon: "\uD83D\uDC31", label: "Cat" },
  { id: "panda", icon: "\uD83D\uDC3C", label: "Panda" },
  { id: "tiger", icon: "\uD83D\uDC2F", label: "Tiger" },
  { id: "owl", icon: "\uD83E\uDD89", label: "Owl" },
  { id: "rabbit", icon: "\uD83D\uDC30", label: "Rabbit" },
  { id: "bear", icon: "\uD83D\uDC3B", label: "Bear" },
  { id: "unicorn", icon: "\uD83E\uDD84", label: "Unicorn" },
];

const DEFAULT_AVATAR_ID = AVATAR_OPTIONS[0].id;

function getUserKey(user) {
  if (!user) return "";
  if (user.id != null) return `id_${user.id}`;
  if (user.username) return `u_${String(user.username).toLowerCase()}`;
  return "";
}

function getStorageKeys(user) {
  if (!user) return [];
  const keys = [];
  if (user.id != null) keys.push(`${AVATAR_KEY_PREFIX}id_${user.id}`);
  if (user.username) keys.push(`${AVATAR_KEY_PREFIX}u_${String(user.username).toLowerCase()}`);
  return keys;
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getAvatarIdForUser(user) {
  const storageKeys = getStorageKeys(user);
  for (const key of storageKeys) {
    const raw = localStorage.getItem(key);
    if (raw && AVATAR_OPTIONS.some((option) => option.id === raw)) {
      return raw;
    }
  }

  const key = getUserKey(user);
  if (key) {
    const index = hashString(key) % AVATAR_OPTIONS.length;
    return AVATAR_OPTIONS[index].id;
  }
  return DEFAULT_AVATAR_ID;
}

export function setAvatarIdForUser(user, avatarId) {
  if (!AVATAR_OPTIONS.some((option) => option.id === avatarId)) return;
  const keys = getStorageKeys(user);
  if (!keys.length) return;
  keys.forEach((key) => localStorage.setItem(key, avatarId));
}

export function getAvatarOptionById(avatarId) {
  return AVATAR_OPTIONS.find((option) => option.id === avatarId) || AVATAR_OPTIONS[0];
}

export function getAvatarForUser(user) {
  return getAvatarOptionById(getAvatarIdForUser(user));
}
