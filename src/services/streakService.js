const STORAGE_KEY = "cv_user_streak_activity_v1";

function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(base, days) {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function getUserKey(user) {
  return String(user?.id || user?.username || "anon");
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next || {}));
  } catch {}
}

function isProUser(user, isProOverride = null) {
  if (typeof isProOverride === "boolean") return isProOverride;
  return (
    !!user?.premium ||
    String(user?.planType || "").toUpperCase() === "PRO" ||
    String(user?.subscriptionPlan || "").toUpperCase() === "PRO"
  );
}

export function markStreakActivity(user) {
  const key = getUserKey(user);
  const day = toDayKey(new Date());
  const store = readStore();
  const userDays = Array.isArray(store[key]) ? store[key] : [];
  if (!userDays.includes(day)) {
    userDays.push(day);
    userDays.sort();
    store[key] = userDays;
    writeStore(store);
  }
}

export function getStreakInfo(user, isProOverride = null) {
  const key = getUserKey(user);
  const store = readStore();
  const userDays = Array.isArray(store[key]) ? store[key] : [];
  const daySet = new Set(userDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const graceMax = isProUser(user, isProOverride) ? 1 : 0;

  let streak = 0;
  let missesUsed = 0;
  for (let i = 0; i < 3650; i += 1) {
    const cursor = addDays(today, -i);
    const cursorKey = toDayKey(cursor);
    if (daySet.has(cursorKey)) {
      streak += 1;
      continue;
    }
    if (missesUsed < graceMax) {
      missesUsed += 1;
      continue;
    }
    break;
  }

  return { streak, graceUsed: missesUsed, graceMax };
}
