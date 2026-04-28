const pool = require('../../config/db');
const logger = require('../../shared/utils/logger');
const { recalculateCycle, normalizeDateForPrediction } = require('../cycle/recalculateCycle');

function parseDefaultCycleLength(value) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		return null;
	}

	return Math.round(parsed);
}

function isValidISODate(value) {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function getPrediction(req, res) {
	try {
		const userId = req.user.userId;
		const requestedDefaultCycleLength = parseDefaultCycleLength(req.query.defaultCycleLength);
		const { from, to } = req.query;

		if (from && !isValidISODate(from)) {
			return res.status(400).json({
				message: "from must be a valid date in YYYY-MM-DD format.",
			});
		}

		if (to && !isValidISODate(to)) {
			return res.status(400).json({
				message: "to must be a valid date in YYYY-MM-DD format.",
			});
		}

		const query = `
			SELECT period_start_date, period_end_date, cycle_length
			FROM cycle_history
			WHERE user_id = $1
			ORDER BY period_start_date ASC
		`;

		const { rows } = await pool.query(query, [userId]);
		const completeCycleRows = rows.filter((row) => Boolean(row?.period_start_date && row?.period_end_date));
		const periodStartDates = completeCycleRows.map((row) => normalizeDateForPrediction(row.period_start_date));

		let storedCycleLength = null;
		for (let index = completeCycleRows.length - 1; index >= 0; index -= 1) {
			const candidate = Number(completeCycleRows[index].cycle_length);
			if (Number.isFinite(candidate) && candidate > 0) {
				storedCycleLength = Math.round(candidate);
				break;
			}
		}

		const resolvedDefaultCycleLength = requestedDefaultCycleLength || storedCycleLength || 28;

		const prediction = recalculateCycle({
			rows,
			preferredCycleLength: resolvedDefaultCycleLength,
			from,
			to,
		});

		if (!rows.length) {
			return res.status(200).json({
				...prediction,
				message: "No cycle history found. Add at least one period date.",
			});
		}

		if (!periodStartDates.length) {
			return res.status(200).json({
				...prediction,
				message: "Only completed cycles are used for adaptive learning. Mark period end to improve predictions.",
			});
		}

		return res.status(200).json(prediction);
	} catch (error) {
		logger.error({ msg: "Failed to generate prediction", error: error.message });
		return res.status(500).json({
			message: "Failed to generate prediction.",
		});
	}
}

module.exports = {
	getPrediction,
};
