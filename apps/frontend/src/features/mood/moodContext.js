const MOOD_CHAT_CONTEXT_KEY = "sakhi_mood_chat_context";

export function saveMoodChatContext(context) {
  const payload = context && typeof context === "object" ? context : {};
  localStorage.setItem(MOOD_CHAT_CONTEXT_KEY, JSON.stringify(payload));
}

export function getMoodChatContext() {
  const raw = localStorage.getItem(MOOD_CHAT_CONTEXT_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function clearMoodChatContext() {
  localStorage.removeItem(MOOD_CHAT_CONTEXT_KEY);
}
