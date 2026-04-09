const pool = require("../config/db");
const { buildPrediction } = require("../utils/predictionUtils");

function parseDefaultCycleLength(value) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		return 28;
	}

	return Math.round(parsed);
}

function normalizeDateForPrediction(value) {
	if (typeof value === "string") {
		return value.slice(0, 10);
	}

	const date = new Date(value);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

async function getPrediction(req, res) {
	try {
		const userId = req.user.userId;
		const defaultCycleLength = parseDefaultCycleLength(req.query.defaultCycleLength);

		const query = `
			SELECT period_start_date
			FROM cycle_history
			WHERE user_id = $1
			ORDER BY period_start_date ASC
		`;

		const { rows } = await pool.query(query, [userId]);
		const periodStartDates = rows.map((row) => normalizeDateForPrediction(row.period_start_date));

		const prediction = buildPrediction(periodStartDates, defaultCycleLength);

		if (!periodStartDates.length) {
			return res.status(200).json({
				...prediction,
				message: "No cycle history found. Add at least one period date.",
			});
		}

		return res.status(200).json(prediction);
	} catch (error) {
		console.error("Failed to generate prediction", error);
		return res.status(500).json({
			message: "Failed to generate prediction.",
		});
	}
}

module.exports = {
	getPrediction,
};
