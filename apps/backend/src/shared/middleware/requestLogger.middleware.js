const { randomUUID } = require("crypto");
const logger = require('../utils/logger');

function resolveRequestId(req) {
	const incomingRequestId = String(req.headers["x-request-id"] || "").trim();

	if (incomingRequestId) {
		return incomingRequestId;
	}

	return randomUUID();
}

function requestLoggerMiddleware(req, res, next) {
	const requestId = resolveRequestId(req);
	const startedAt = process.hrtime.bigint();

	req.requestId = requestId;
	req.log = logger.child({ requestId });
	res.setHeader("x-request-id", requestId);

	req.log.info({
		msg: "request started",
		method: req.method,
		url: req.originalUrl,
	});

	res.on("finish", () => {
		const finishedAt = process.hrtime.bigint();
		const durationMs = Number(finishedAt - startedAt) / 1_000_000;

		req.log.info({
			msg: "request completed",
			method: req.method,
			url: req.originalUrl,
			statusCode: res.statusCode,
			durationMs: Math.round(durationMs * 10) / 10,
		});
	});

	return next();
}

module.exports = requestLoggerMiddleware;
