const express = require("express");
const cors = require("cors");

const logger = require('./shared/utils/logger');
const { getMetricsText, getContentType, dbPoolActiveConnections, METRICS_ENABLED } = require('./shared/utils/metrics');
const { getAlertStatus, checkDbPoolExhaustion } = require('./shared/utils/alertRules');
const requestLoggerMiddleware = require('./shared/middleware/requestLogger.middleware');
const metricsMiddleware = require('./shared/middleware/metrics.middleware');

const authRoutes = require('./modules/auth/auth.routes');
const cycleRoutes = require('./modules/cycle/cycle.routes');
const dailyLogRoutes = require('./modules/daily-logs/dailyLog.routes');
const nutritionRoutes = require('./modules/nutrition/nutrition.routes');
const predictionRoutes = require('./modules/prediction/prediction.routes');

const pool = require('./config/db');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
	: true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());
app.use(requestLoggerMiddleware);
app.use(metricsMiddleware);

// Prometheus metrics endpoint.
app.get("/metrics", async (req, res) => {
	if (!METRICS_ENABLED) {
		return res.status(404).json({ message: "Metrics not enabled." });
	}

	try {
		// Update DB pool gauge before serving metrics.
		dbPoolActiveConnections.set(pool.totalCount - pool.idleCount);

		const metricsText = await getMetricsText();
		res.set("Content-Type", getContentType());
		return res.status(200).end(metricsText);
	} catch (error) {
		logger.error({ msg: "Failed to generate metrics", error: error.message });
		return res.status(500).json({ message: "Failed to generate metrics." });
	}
});

// Enriched health check with DB status, pool stats, cache info, and alert status.
app.get("/api/health", async (req, res) => {
	try {
		await pool.query("SELECT 1");

		// Update DB pool gauge.
		dbPoolActiveConnections.set(pool.totalCount - pool.idleCount);
		checkDbPoolExhaustion(pool);

		// Get cache stats.
		let cacheCount = 0;
		try {
			const cacheResult = await pool.query("SELECT COUNT(*) AS count FROM nutrition_cache WHERE expires_at > NOW()");
			cacheCount = Number(cacheResult.rows[0]?.count) || 0;
		} catch (_ignored) {
			// Table may not exist yet.
		}

		return res.status(200).json({
			status: "ok",
			service: "sakhi-backend",
			database: "up",
			timestamp: new Date().toISOString(),
			uptime: Math.round(process.uptime()),
			requestId: req.requestId,
			pool: {
				total: pool.totalCount || 0,
				idle: pool.idleCount || 0,
				waiting: pool.waitingCount || 0,
			},
			cache: {
				nutritionEntries: cacheCount,
			},
			alerts: getAlertStatus(pool),
		});
	} catch (error) {
		logger.error({ msg: "Health check failed", error: error.message, requestId: req.requestId });
		return res.status(503).json({
			status: "degraded",
			service: "sakhi-backend",
			database: "down",
			message: "Database connectivity check failed.",
			timestamp: new Date().toISOString(),
			requestId: req.requestId,
		});
	}
});

app.use("/", authRoutes);
app.use("/cycle", cycleRoutes);
app.use("/daily-logs", dailyLogRoutes);
app.use("/prediction", predictionRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/cycle", cycleRoutes);
app.use("/api/daily-logs", dailyLogRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/prediction", predictionRoutes);

app.use((req, res) => {
	return res.status(404).json({
		message: "Route not found.",
		requestId: req.requestId,
	});
});

app.use((error, req, res, next) => {
	const { recordError } = require('./shared/utils/alertRules');
	recordError();

	const requestId = req.requestId || "unknown";
	logger.error({ msg: "Unhandled server error", error, requestId });

	return res.status(500).json({
		message: "Internal server error.",
		requestId,
	});
});


const moodRoutes = require('./modules/mood/mood.routes');
const symptomRoutes = require('./modules/symptoms/symptom.routes');
const chatRoutes = require('./modules/chatbot/chat.routes');
const mythsRoutes = require('./modules/myths/myths.routes');

app.use('/api/mood', moodRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/myths', mythsRoutes);

module.exports = app;
