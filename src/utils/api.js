const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
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

export function getPrediction(token, defaultCycleLength) {
  const suffix = Number.isFinite(defaultCycleLength)
    ? `?defaultCycleLength=${encodeURIComponent(String(defaultCycleLength))}`
    : "";

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
