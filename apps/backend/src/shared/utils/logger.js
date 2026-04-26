const pino = require("pino");

const LOG_LEVEL = String(process.env.LOG_LEVEL || "info").trim().toLowerCase();
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const IS_TEST = process.env.NODE_ENV === "test";

function resolveLogLevel() {
	const validLevels = ["trace", "debug", "info", "warn", "error", "fatal", "silent"];

	if (validLevels.includes(LOG_LEVEL)) {
		return LOG_LEVEL;
	}

	if (IS_TEST) {
		return "silent";
	}

	return "info";
}

function buildTransport() {
	if (IS_TEST) {
		return undefined;
	}

	if (!IS_PRODUCTION) {
		return {
			target: "pino-pretty",
			options: {
				colorize: true,
				translateTime: "SYS:standard",
				ignore: "pid,hostname",
			},
		};
	}

	return undefined;
}

const logger = pino({
	level: resolveLogLevel(),
	transport: buildTransport(),
	base: {
		service: "sakhi-backend",
	},
	timestamp: pino.stdTimeFunctions.isoTime,
	serializers: {
		err: pino.stdSerializers.err,
		error: pino.stdSerializers.err,
	},
	formatters: {
		level(label) {
			return { level: label };
		},
	},
});

module.exports = logger;
