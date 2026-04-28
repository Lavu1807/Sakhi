const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Failed to connect to server. Please check backend is running.");
  }

  let data = {};
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text ? { message: text } : {};
    }
  } catch {
    data = {};
  }

  if (!response.ok) {
    const fallbackMessage = response.statusText || `Request failed (${response.status}).`;
    throw new Error(data.message || fallbackMessage || "Something went wrong.");
  }

  return data;
}

export function signupUser(payload) {
  return request("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export function loginUser(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function forgotPassword(payload) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: payload,
  });
}

export function addCycleEntry(payload, token) {
  return request("/cycle", {
    method: "POST",
    body: payload,
    token,
  });
}

export function getCycleHistory(token) {
  return request("/cycle", {
    method: "GET",
    token,
  });
}

export function getCycleStatus(token) {
  return request("/cycle/status", {
    method: "GET",
    token,
  });
}

export function markPeriodEnd(payload, token) {
  return request("/cycle/end", {
    method: "PATCH",
    body: payload,
    token,
  });
}

export function updateCycleEntry(entryId, payload, token) {
  return request(`/cycle/${entryId}`, {
    method: "PATCH",
    body: payload,
    token,
  });
}

export function deleteCycleEntry(entryId, token) {
  return request(`/cycle/${entryId}`, {
    method: "DELETE",
    token,
  });
}

export function getPrediction(token, options = {}) {
  const query = new URLSearchParams();
  let defaultCycleLength;
  let from;
  let to;

  if (typeof options === "number") {
    defaultCycleLength = options;
  } else if (options && typeof options === "object") {
    defaultCycleLength = options.defaultCycleLength;
    from = options.from;
    to = options.to;
  }

  if (Number.isFinite(defaultCycleLength)) {
    query.set("defaultCycleLength", String(defaultCycleLength));
  }

  if (from) {
    query.set("from", String(from));
  }

  if (to) {
    query.set("to", String(to));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request(`/prediction${suffix}`, {
    method: "GET",
    token,
  });
}

export function addDailyLog(payload, token) {
  return request("/daily-logs", {
    method: "POST",
    body: payload,
    token,
  });
}

export function getDailyLogs(token, { from, to } = {}) {
  const query = new URLSearchParams();

  if (from) {
    query.set("from", from);
  }

  if (to) {
    query.set("to", to);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request(`/daily-logs${suffix}`, {
    method: "GET",
    token,
  });
}

export async function getDailyLogForDate(token, date) {
  const response = await getDailyLogs(token, {
    from: date,
    to: date,
  });

  if (!Array.isArray(response?.entries) || response.entries.length === 0) {
    return null;
  }

  return response.entries[0];
}

export function addMoodEntry(payload, token) {
  return request("/mood", {
    method: "POST",
    body: payload,
    token,
  });
}

export function getMoodEntries(token, { from, to, phase, limit } = {}) {
  const query = new URLSearchParams();

  if (from) {
    query.set("from", from);
  }

  if (to) {
    query.set("to", to);
  }

  if (phase) {
    query.set("phase", phase);
  }

  if (limit !== undefined && limit !== null && limit !== "") {
    query.set("limit", String(limit));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request(`/mood${suffix}`, {
    method: "GET",
    token,
  });
}

export function getFoodNutrition(food, token) {
  return request(`/nutrition/${encodeURIComponent(food)}`, {
    method: "GET",
    token,
  });
}

export function getMyths(category, { phase, symptoms } = {}) {
  const query = new URLSearchParams();

  if (category && category !== "All") {
    query.set("category", category);
  }

  if (phase && String(phase).trim()) {
    query.set("phase", String(phase).trim());
  }

  if (Array.isArray(symptoms) && symptoms.length > 0) {
    query.set("symptoms", symptoms.join(","));
  } else if (typeof symptoms === "string" && symptoms.trim()) {
    query.set("symptoms", symptoms.trim());
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request(`/myths${suffix}`, {
    method: "GET",
  });
}

export function getRandomMyth() {
  return request("/myths/random", {
    method: "GET",
  });
}

export function sendMythFeedback(payload) {
  return request("/myths/feedback", {
    method: "POST",
    body: payload,
  });
}

export function sendChatMessage(payload, token) {
  return request("/chat", {
    method: "POST",
    body: payload,
    token,
  });
}
