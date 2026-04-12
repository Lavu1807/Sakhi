const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const cycleRoutes = require("./routes/cycleRoutes");
const dailyLogRoutes = require("./routes/dailyLogRoutes");
const moodRoutes = require("./routes/moodRoutes");
const symptomRoutes = require("./routes/symptomRoutes");
const mythsRoutes = require("./routes/mythsRoutes");
const nutritionRoutes = require("./routes/nutritionRoutes");
const predictionRoutes = require("./routes/predictionRoutes");

const app = express();

const corsOrigin = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
	: true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/api/health", (req, res) => {
	return res.status(200).json({
		status: "ok",
		service: "sakhi-backend",
		timestamp: new Date().toISOString(),
	});
});

app.use("/", authRoutes);
app.use("/cycle", cycleRoutes);
app.use("/daily-logs", dailyLogRoutes);
app.use("/mood", moodRoutes);
app.use("/symptoms", symptomRoutes);
app.use("/nutrition", nutritionRoutes);
app.use("/prediction", predictionRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/cycle", cycleRoutes);
app.use("/api/daily-logs", dailyLogRoutes);
app.use("/api/mood", moodRoutes);
app.use("/api/symptoms", symptomRoutes);
app.use("/api/myths", mythsRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/prediction", predictionRoutes);

app.use((req, res) => {
	return res.status(404).json({
		message: "Route not found.",
	});
});

app.use((error, req, res, next) => {
	console.error("Unhandled server error", error);
	return res.status(500).json({
		message: "Internal server error.",
	});
});

module.exports = app;
