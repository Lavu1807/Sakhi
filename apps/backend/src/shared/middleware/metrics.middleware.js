const { httpRequestsTotal, httpRequestDurationSeconds, METRICS_ENABLED } = require('../utils/metrics');

function normalizeRoutePath(req) {
	// Use the matched route pattern if available, otherwise the original URL.
	if (req.route && req.route.path) {
		return req.baseUrl + req.route.path;
	}

	// Fallback: strip query params and normalize.
	const path = req.originalUrl.split("?")[0];

	// Collapse numeric IDs in paths to :id for cardinality control.
	return path.replace(/\/\d+/g, "/:id");
}

function metricsMiddleware(req, res, next) {
	if (!METRICS_ENABLED) {
		return next();
	}

	const startTime = process.hrtime.bigint();

	res.on("finish", () => {
		const route = normalizeRoutePath(req);
		const method = req.method;
		const statusCode = String(res.statusCode);
		const durationSeconds = Number(process.hrtime.bigint() - startTime) / 1_000_000_000;

		httpRequestsTotal.inc({ method, route, status_code: statusCode });
		httpRequestDurationSeconds.observe({ method, route }, durationSeconds);
	});

	return next();
}

module.exports = metricsMiddleware;
