const rateLimit = require("express-rate-limit");

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TEN_MINUTES_MS = 10 * 60 * 1000;

function buildLimiter({ windowMs, max, message, skipSuccessfulRequests = false }) {
	return rateLimit({
		windowMs,
		max,
		standardHeaders: "draft-7",
		legacyHeaders: false,
		skipSuccessfulRequests,
		message: {
			message,
		},
	});
}

const apiLimiter = buildLimiter({
	windowMs: FIFTEEN_MINUTES_MS,
	max: 300,
	message: "Too many API requests from this client. Please try again shortly.",
});

const authLimiter = buildLimiter({
	windowMs: FIFTEEN_MINUTES_MS,
	max: 20,
	skipSuccessfulRequests: true,
	message: "Too many authentication attempts. Please wait and try again.",
});

const chatLimiter = buildLimiter({
	windowMs: TEN_MINUTES_MS,
	max: 80,
	message: "Chat request limit reached. Please try again in a few minutes.",
});

module.exports = {
	apiLimiter,
	authLimiter,
	chatLimiter,
};
