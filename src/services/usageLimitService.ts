const WINDOW_MS = 24 * 60 * 60 * 1000;
const LIMIT_MESSAGE = "Limit reached, Pro coming soon. Try again after 24 hours.";

type UsageKey = "prescriptionScans" | "chatInputs";

const KEYS: Record<UsageKey, string> = {
  prescriptionScans: "tedimed_usage_prescription_scans",
  chatInputs: "tedimed_usage_chat_inputs",
};

function getRecentEntries(key: UsageKey) {
  const now = Date.now();
  const raw = localStorage.getItem(KEYS[key]);
  const entries = raw ? (JSON.parse(raw) as number[]) : [];
  return entries.filter((timestamp) => now - timestamp < WINDOW_MS);
}

function saveEntries(key: UsageKey, entries: number[]) {
  localStorage.setItem(KEYS[key], JSON.stringify(entries));
}

export const usageLimitService = {
  message: LIMIT_MESSAGE,

  canUse(key: UsageKey, limit: number) {
    const entries = getRecentEntries(key);
    saveEntries(key, entries);
    return entries.length < limit;
  },

  recordUse(key: UsageKey) {
    const entries = [...getRecentEntries(key), Date.now()];
    saveEntries(key, entries);
    return entries.length;
  },
};
