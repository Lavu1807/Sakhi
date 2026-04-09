const pool = require("../config/db");

const ALLOWED_FLOW_INTENSITY = ["light", "medium", "heavy"];

function isValidISODate(dateString) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		return false;
	}

	const date = new Date(`${dateString}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime());
}

function normalizeDateForResponse(value) {
	if (!value) {
		return null;
	}

	if (typeof value === "string") {
		return value.slice(0, 10);
	}

	const date = new Date(value);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function toUTCDate(dateString) {
	return new Date(`${dateString}T00:00:00.000Z`);
}

function normalizeOptionalPositiveInteger(value) {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

async function addCycleEntry(req, res) {
	try {
		const {
			period_start_date: periodStartDate,
			period_end_date: periodEndDate,
			cycle_length: cycleLength,
			flow_intensity: flowIntensity,
		} = req.body;
		const userId = req.user.userId;

		if (!periodStartDate || !isValidISODate(periodStartDate)) {
			return res.status(400).json({
				message: "period_start_date must be a valid date in YYYY-MM-DD format.",
			});
		}

		if (periodEndDate && !isValidISODate(periodEndDate)) {
			return res.status(400).json({
				message: "period_end_date must be a valid date in YYYY-MM-DD format.",
			});
		}

		if (periodEndDate && toUTCDate(periodEndDate) < toUTCDate(periodStartDate)) {
			return res.status(400).json({
				message: "period_end_date cannot be earlier than period_start_date.",
			});
		}

		const normalizedFlowIntensity = flowIntensity ? String(flowIntensity).trim().toLowerCase() : null;
		if (normalizedFlowIntensity && !ALLOWED_FLOW_INTENSITY.includes(normalizedFlowIntensity)) {
			return res.status(400).json({
				message: "flow_intensity must be one of: light, medium, heavy.",
			});
		}

		let normalizedCycleLength = normalizeOptionalPositiveInteger(cycleLength);

		if (cycleLength !== undefined && normalizedCycleLength === null) {
			return res.status(400).json({
				message: "cycle_length must be a positive integer.",
			});
		}

		if (!normalizedCycleLength && periodEndDate) {
			const diffInDays = Math.round((toUTCDate(periodEndDate) - toUTCDate(periodStartDate)) / (24 * 60 * 60 * 1000));
			normalizedCycleLength = diffInDays > 0 ? diffInDays : null;
		}

		const query = `
			INSERT INTO cycle_history (user_id, period_start_date, period_end_date, cycle_length, flow_intensity)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, user_id, period_start_date, period_end_date, cycle_length, flow_intensity, created_at
		`;

		const { rows } = await pool.query(query, [
			userId,
			periodStartDate,
			periodEndDate || null,
			normalizedCycleLength,
			normalizedFlowIntensity,
		]);
		const entry = rows[0];

		return res.status(201).json({
			message: "Cycle entry added successfully.",
			entry: {
				id: entry.id,
				user_id: entry.user_id,
				period_start_date: normalizeDateForResponse(entry.period_start_date),
				period_end_date: normalizeDateForResponse(entry.period_end_date),
				cycle_length: entry.cycle_length,
				flow_intensity: entry.flow_intensity,
				created_at: entry.created_at,
			},
		});
	} catch (error) {
		if (error.code === "23505") {
			return res.status(409).json({
				message: "This period date has already been added.",
			});
		}

		if (error.code === "23514") {
			return res.status(400).json({
				message: "One or more cycle fields are invalid.",
			});
		}

		console.error("Failed to add cycle entry", error);
		return res.status(500).json({
			message: "Failed to add cycle entry.",
		});
	}
}

async function getCycleHistory(req, res) {
	try {
		const userId = req.user.userId;

		const query = `
			SELECT id, user_id, period_start_date, period_end_date, cycle_length, flow_intensity, created_at
			FROM cycle_history
			WHERE user_id = $1
			ORDER BY period_start_date DESC
		`;

		const { rows } = await pool.query(query, [userId]);

		const history = rows.map((row) => ({
			id: row.id,
			user_id: row.user_id,
			period_start_date: normalizeDateForResponse(row.period_start_date),
			period_end_date: normalizeDateForResponse(row.period_end_date),
			cycle_length: row.cycle_length,
			flow_intensity: row.flow_intensity,
			created_at: row.created_at,
		}));

		return res.status(200).json({
			entries: history,
		});
	} catch (error) {
		console.error("Failed to fetch cycle history", error);
		return res.status(500).json({
			message: "Failed to fetch cycle history.",
		});
	}
}

module.exports = {
	addCycleEntry,
	getCycleHistory,
};
