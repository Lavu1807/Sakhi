const logger = require("./logger");
const { alertsFiredTotal } = require("./metrics");

const ALERT_WEBHOOK_URL = String(process.env.ALERT_WEBHOOK_URL || "").trim();

// Sliding window counters for threshold-based alerting.
const windows = {
	errors: { count: 0, windowStartMs: Date.now() },
	usdaFailures: { count: 0, windowStartMs: Date.now() },
};

const WINDOW_DURATION_MS = 60_000;
const ERROR_RATE_THRESHOLD = 10;
const USDA_FAILURE_STREAK_THRESHOLD = 5;
const DB_POOL_EXHAUSTION_THRESHOLD = 0.9;

function resetWindowIfExpired(windowName) {
	const window = windows[windowName];

	if (!window) {
		return;
	}

	const now = Date.now();
	if (now - window.windowStartMs >= WINDOW_DURATION_MS) {
		window.count = 0;
		window.windowStartMs = now;
	}
}

function incrementWindow(windowName) {
	resetWindowIfExpired(windowName);
	const window = windows[windowName];

	if (!window) {
		return 0;
	}

	window.count += 1;
	return window.count;
}

function getWindowCount(windowName) {
	resetWindowIfExpired(windowName);
	const window = windows[windowName];
	return window ? window.count : 0;
}

async function dispatchWebhookAlert(alertPayload) {
	if (!ALERT_WEBHOOK_URL) {
		return;
	}

	try {
		const axios = require("axios");
		await axios.post(ALERT_WEBHOOK_URL, alertPayload, { timeout: 5000 });
		logger.info({ msg: "alert webhook dispatched", rule: alertPayload.rule });
	} catch (error) {
		logger.warn({ msg: "alert webhook dispatch failed", error: error.message });
	}
}

function fireAlert(rule, severity, details) {
	const alertPayload = {
		rule,
		severity,
		details,
		timestamp: new Date().toISOString(),
		service: "sakhi-backend",
	};

	logger.warn({
		msg: `ALERT [${severity}] ${rule}`,
		alert: alertPayload,
	});

	alertsFiredTotal.inc({ rule, severity });
	dispatchWebhookAlert(alertPayload);
}

function checkErrorRate() {
	const errorCount = getWindowCount("errors");

	if (errorCount >= ERROR_RATE_THRESHOLD) {
		fireAlert("high_error_rate", "CRITICAL", {
			errorCount,
			windowSeconds: WINDOW_DURATION_MS / 1000,
			message: `Error count (${errorCount}) exceeded threshold (${ERROR_RATE_THRESHOLD}) in the last ${WINDOW_DURATION_MS / 1000}s.`,
		});
	}
}

function checkUsdaFailureStreak() {
	const failureCount = getWindowCount("usdaFailures");

	if (failureCount >= USDA_FAILURE_STREAK_THRESHOLD) {
		fireAlert("usda_api_failure_streak", "WARNING", {
			failureCount,
			message: `USDA API failure streak (${failureCount}) exceeded threshold (${USDA_FAILURE_STREAK_THRESHOLD}).`,
		});
	}
}

function checkDbPoolExhaustion(pool) {
	if (!pool) {
		return;
	}

	const totalCount = pool.totalCount || 0;
	const idleCount = pool.idleCount || 0;
	const waitingCount = pool.waitingCount || 0;

	if (totalCount === 0) {
		return;
	}

	const utilizationRatio = (totalCount - idleCount) / totalCount;

	if (utilizationRatio >= DB_POOL_EXHAUSTION_THRESHOLD || waitingCount > 0) {
		fireAlert("db_pool_exhaustion", "WARNING", {
			totalCount,
			idleCount,
			waitingCount,
			utilizationRatio: Math.round(utilizationRatio * 100),
			message: `DB pool utilization at ${Math.round(utilizationRatio * 100)}% with ${waitingCount} waiting queries.`,
		});
	}
}

function recordError() {
	incrementWindow("errors");
	checkErrorRate();
}

function recordUsdaFailure() {
	incrementWindow("usdaFailures");
	checkUsdaFailureStreak();
}

function getAlertStatus(pool) {
	return {
		errorRate: {
			count: getWindowCount("errors"),
			threshold: ERROR_RATE_THRESHOLD,
			windowSeconds: WINDOW_DURATION_MS / 1000,
		},
		usdaFailures: {
			count: getWindowCount("usdaFailures"),
			threshold: USDA_FAILURE_STREAK_THRESHOLD,
		},
		dbPool: pool
			? {
				totalCount: pool.totalCount || 0,
				idleCount: pool.idleCount || 0,
				waitingCount: pool.waitingCount || 0,
			}
			: null,
	};
}

module.exports = {
	recordError,
	recordUsdaFailure,
	checkDbPoolExhaustion,
	getAlertStatus,
};
