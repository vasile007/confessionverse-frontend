const AI_DAILY_FREE_LIMIT = 3;
const STORAGE_KEY = "cv_ai_daily_usage_v1";
const WINDOW_MS = 24 * 60 * 60 * 1000;

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

function resolveUserKey(user) {
  return String(user?.id || user?.username || "anon");
}

function toDayStartMs(dayKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dayKey || ""))) return null;
  const [y, m, d] = String(dayKey).split("-").map((v) => Number(v));
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  const t = dt.getTime();
  return Number.isFinite(t) ? t : null;
}

function normalizeUserEvents(rawUserValue, nowTs) {
  // New format: array of timestamps (ms).
  if (Array.isArray(rawUserValue)) {
    return rawUserValue
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0 && nowTs - v < WINDOW_MS);
  }

  // Legacy format: { "YYYY-MM-DD": count }. Migrate safely.
  if (rawUserValue && typeof rawUserValue === "object") {
    const migrated = [];
    for (const [dayKey, countRaw] of Object.entries(rawUserValue)) {
      const count = Math.max(0, Number(countRaw || 0));
      const dayStart = toDayStartMs(dayKey);
      if (!dayStart || !count) continue;
      // Put legacy events at local noon for that day, then prune by 24h window.
      const approxTs = dayStart + 12 * 60 * 60 * 1000;
      for (let i = 0; i < count; i += 1) migrated.push(approxTs + i);
    }
    return migrated.filter((v) => nowTs - v < WINDOW_MS);
  }

  return [];
}

export function isProUser(user) {
  return (
    !!user?.premium ||
    String(user?.planType || "").toUpperCase() === "PRO" ||
    String(user?.subscriptionPlan || "").toUpperCase() === "PRO"
  );
}

export function getAiQuotaState(user) {
  const pro = isProUser(user);
  if (pro) {
    return { isPro: true, used: 0, remaining: Infinity, limit: Infinity };
  }
  const nowTs = Date.now();
  const key = resolveUserKey(user);
  const store = readStore();
  const events = normalizeUserEvents(store?.[key], nowTs);
  const used = events.length;
  const remaining = Math.max(0, AI_DAILY_FREE_LIMIT - used);
  // Self-heal storage: keep only rolling 24h timestamps.
  store[key] = events;
  writeStore(store);
  return { isPro: false, used, remaining, limit: AI_DAILY_FREE_LIMIT };
}

export function tryConsumeAiUse(user) {
  const state = getAiQuotaState(user);
  if (state.isPro) return { ok: true, ...state };
  if (state.remaining <= 0) return { ok: false, ...state };

  const nowTs = Date.now();
  const key = resolveUserKey(user);
  const store = readStore();
  const events = normalizeUserEvents(store?.[key], nowTs);
  events.push(nowTs);
  store[key] = events;
  writeStore(store);

  const next = getAiQuotaState(user);
  return { ok: true, ...next };
}
