const SYMPTOM_CHAT_CONTEXT_KEY = "sakhi_symptom_chat_context";

export function saveSymptomChatContext(context) {
  const payload = context && typeof context === "object" ? context : {};
  localStorage.setItem(SYMPTOM_CHAT_CONTEXT_KEY, JSON.stringify(payload));
}

export function getSymptomChatContext() {
  const raw = localStorage.getItem(SYMPTOM_CHAT_CONTEXT_KEY);
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

export function clearSymptomChatContext() {
  localStorage.removeItem(SYMPTOM_CHAT_CONTEXT_KEY);
}