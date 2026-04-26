const client = require("prom-client");

const METRICS_ENABLED = String(process.env.METRICS_ENABLED || "true").trim().toLowerCase() !== "false";

// Collect default Node.js metrics (event loop lag, heap, GC) when enabled.
if (METRICS_ENABLED) {
	client.collectDefaultMetrics({ prefix: "sakhi_" });
}

// --- HTTP Metrics ---

const httpRequestsTotal = new client.Counter({
	name: "sakhi_http_requests_total",
	help: "Total number of HTTP requests",
	labelNames: ["method", "route", "status_code"],
});

const httpRequestDurationSeconds = new client.Histogram({
	name: "sakhi_http_request_duration_seconds",
	help: "Duration of HTTP requests in seconds",
	labelNames: ["method", "route"],
	buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// --- Database Metrics ---

const dbPoolActiveConnections = new client.Gauge({
	name: "sakhi_db_pool_active_connections",
	help: "Number of active connections in the PostgreSQL pool",
});

const dbQueryDurationSeconds = new client.Histogram({
	name: "sakhi_db_query_duration_seconds",
	help: "Duration of database queries in seconds",
	labelNames: ["operation"],
	buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// --- USDA API Metrics ---

const usdaApiCallsTotal = new client.Counter({
	name: "sakhi_usda_api_calls_total",
	help: "Total USDA API calls",
	labelNames: ["status"],
});

const nutritionCacheSize = new client.Gauge({
	name: "sakhi_nutrition_cache_size",
	help: "Number of entries in the nutrition cache",
});

// --- Auth Metrics ---

const authAttemptsTotal = new client.Counter({
	name: "sakhi_auth_attempts_total",
	help: "Total authentication attempts",
	labelNames: ["result"],
});

// --- Alert Metrics ---

const alertsFiredTotal = new client.Counter({
	name: "sakhi_alerts_fired_total",
	help: "Total alerts fired by the alert rules engine",
	labelNames: ["rule", "severity"],
});

async function getMetricsText() {
	return client.register.metrics();
}

function getContentType() {
	return client.register.contentType;
}

module.exports = {
	httpRequestsTotal,
	httpRequestDurationSeconds,
	dbPoolActiveConnections,
	dbQueryDurationSeconds,
	usdaApiCallsTotal,
	nutritionCacheSize,
	authAttemptsTotal,
	alertsFiredTotal,
	getMetricsText,
	getContentType,
	METRICS_ENABLED,
};
