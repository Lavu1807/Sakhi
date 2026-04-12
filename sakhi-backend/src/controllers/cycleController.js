const pool = require("../config/db");
const { buildPrediction } = require("../utils/predictionUtils");

const ALLOWED_FLOW_INTENSITY = ["light", "medium", "heavy"];

function isValidISODate(dateString) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		return false;
	}

	const date = new Date(`${dateString}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime());
}

function getTodayISODate() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
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

function normalizePeriodStartDates(periodStartDate, periodStartDates) {
	const rawDates = [];

	if (Array.isArray(periodStartDates)) {
		for (const value of periodStartDates) {
			if (typeof value === "string" && value.trim()) {
				rawDates.push(value.trim());
			}
		}
	}

	if (typeof periodStartDate === "string" && periodStartDate.trim()) {
		rawDates.push(periodStartDate.trim());
	}

	const uniqueDates = Array.from(new Set(rawDates));
	if (uniqueDates.length === 0) {
		return null;
	}

	for (const dateValue of uniqueDates) {
		if (!isValidISODate(dateValue)) {
			return null;
		}
	}

	return uniqueDates.sort((a, b) => toUTCDate(a) - toUTCDate(b));
}

function calculateAverageCycleLengthFromDates(periodStartDates) {
	if (!Array.isArray(periodStartDates) || periodStartDates.length < 2) {
		return null;
	}

	let total = 0;
	let count = 0;

	for (let index = 1; index < periodStartDates.length; index += 1) {
		const current = toUTCDate(periodStartDates[index]);
		const previous = toUTCDate(periodStartDates[index - 1]);
		const diffInDays = Math.round((current - previous) / (24 * 60 * 60 * 1000));

		if (diffInDays > 0) {
			total += diffInDays;
			count += 1;
		}
	}

	if (count === 0) {
		return null;
	}

	return Math.round(total / count);
}

function detectInputMethod({ source, periodDateCount, hasCycleLength }) {
	if (String(source || "").trim().toLowerCase() === "calendar") {
		return "direct-calendar-mark";
	}

	if (periodDateCount > 1) {
		return "multiple-period-dates";
	}

	if (hasCycleLength) {
		return "last-period-and-cycle-length";
	}

	return "last-period-date-only";
}

function mapCycleEntry(entry) {
	return {
		id: entry.id,
		user_id: entry.user_id,
		period_start_date: normalizeDateForResponse(entry.period_start_date),
		period_end_date: normalizeDateForResponse(entry.period_end_date),
		is_period_ongoing: Boolean(entry.is_period_ongoing),
		cycle_length: entry.cycle_length,
		flow_intensity: entry.flow_intensity,
		created_at: entry.created_at,
	};
}

async function getPredictionSourceRows(userId) {
	const allDatesQuery = `
		SELECT period_start_date, period_end_date, cycle_length
		FROM cycle_history
		WHERE user_id = $1
		ORDER BY period_start_date ASC
	`;

	const allDatesResult = await pool.query(allDatesQuery, [userId]);
	return allDatesResult.rows;
}

function isCompleteCycleRow(row) {
	return Boolean(row?.period_start_date && row?.period_end_date);
}

function getLatestKnownPeriodStartDate(rows) {
	if (!Array.isArray(rows) || rows.length === 0) {
		return null;
	}

	return normalizeDateForResponse(rows[rows.length - 1].period_start_date);
}

function resolveFallbackCycleLength(rows, preferredCycleLength) {
	if (Number.isFinite(Number(preferredCycleLength)) && Number(preferredCycleLength) > 0) {
		return Math.round(Number(preferredCycleLength));
	}

	for (let index = rows.length - 1; index >= 0; index -= 1) {
		const value = Number(rows[index].cycle_length);
		if (Number.isFinite(value) && value > 0) {
			return Math.round(value);
		}
	}

	return 28;
}

function buildSafePredictionFromHistory(rows, preferredCycleLength) {
	const completeCycleRows = Array.isArray(rows) ? rows.filter((row) => isCompleteCycleRow(row)) : [];
	const completePeriodStartDates = completeCycleRows.map((row) => normalizeDateForResponse(row.period_start_date));
	const fallbackCycleLength = resolveFallbackCycleLength(completeCycleRows, preferredCycleLength);

	return buildPrediction(completePeriodStartDates, fallbackCycleLength, {
		referencePeriodStartDate: getLatestKnownPeriodStartDate(rows),
	});
}

async function addCycleEntry(req, res) {
	try {
		const {
			period_start_date: periodStartDate,
			period_start_dates: periodStartDates,
			period_end_date: periodEndDate,
			cycle_length: cycleLength,
			flow_intensity: flowIntensity,
			source,
		} = req.body;
		const userId = req.user.userId;
		const normalizedPeriodStartDates = normalizePeriodStartDates(periodStartDate, periodStartDates);

		if (!normalizedPeriodStartDates) {
			return res.status(400).json({
				message: "Provide period_start_date or period_start_dates in YYYY-MM-DD format.",
			});
		}

		if (periodEndDate && normalizedPeriodStartDates.length !== 1) {
			return res.status(400).json({
				message: "period_end_date is only supported when a single period_start_date is provided.",
			});
		}

		if (periodEndDate && !isValidISODate(periodEndDate)) {
			return res.status(400).json({
				message: "period_end_date must be a valid date in YYYY-MM-DD format.",
			});
		}

		if (periodEndDate && toUTCDate(periodEndDate) < toUTCDate(normalizedPeriodStartDates[0])) {
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

		const estimatedCycleLength = calculateAverageCycleLengthFromDates(normalizedPeriodStartDates);
		if (!normalizedCycleLength && estimatedCycleLength) {
			normalizedCycleLength = estimatedCycleLength;
		}

		const upsertQuery = `
			INSERT INTO cycle_history (
				user_id,
				period_start_date,
				period_end_date,
				is_period_ongoing,
				cycle_length,
				flow_intensity
			)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (user_id, period_start_date)
			DO UPDATE SET
				period_end_date = COALESCE(EXCLUDED.period_end_date, cycle_history.period_end_date),
				is_period_ongoing = EXCLUDED.is_period_ongoing,
				cycle_length = COALESCE(EXCLUDED.cycle_length, cycle_history.cycle_length),
				flow_intensity = COALESCE(EXCLUDED.flow_intensity, cycle_history.flow_intensity)
			RETURNING id, user_id, period_start_date, period_end_date, is_period_ongoing, cycle_length, flow_intensity, created_at
		`;

		const insertedRows = [];
		for (let index = 0; index < normalizedPeriodStartDates.length; index += 1) {
			const startDate = normalizedPeriodStartDates[index];
			const isLatestInputDate = index === normalizedPeriodStartDates.length - 1;

			const explicitPeriodEnd = normalizedPeriodStartDates.length === 1 && periodEndDate ? periodEndDate : null;
			const shouldMarkOngoing = explicitPeriodEnd
				? false
				: normalizedPeriodStartDates.length === 1
					? true
					: isLatestInputDate;

			if (shouldMarkOngoing) {
				await pool.query(
					`UPDATE cycle_history
					 SET is_period_ongoing = FALSE
					 WHERE user_id = $1 AND is_period_ongoing = TRUE AND period_start_date <> $2`,
					[userId, startDate],
				);
			}

			const { rows } = await pool.query(upsertQuery, [
				userId,
				startDate,
				shouldMarkOngoing ? null : explicitPeriodEnd,
				shouldMarkOngoing,
				normalizedCycleLength,
				normalizedFlowIntensity,
			]);

			insertedRows.push(rows[0]);
		}

		const predictionRows = await getPredictionSourceRows(userId);
		const prediction = buildSafePredictionFromHistory(predictionRows, normalizedCycleLength);

		const entries = insertedRows
			.map((entry) => mapCycleEntry(entry))
			.sort((a, b) => toUTCDate(a.period_start_date) - toUTCDate(b.period_start_date));

		const inputMethod = detectInputMethod({
			source,
			periodDateCount: normalizedPeriodStartDates.length,
			hasCycleLength: Boolean(normalizedCycleLength),
		});

		return res.status(201).json({
			message: "Cycle entry added successfully.",
			inputMethod,
			initialCycleLengthEstimate: estimatedCycleLength,
			entry: entries[entries.length - 1] || null,
			entries,
			prediction,
		});
	} catch (error) {
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

async function markPeriodEnd(req, res) {
	try {
		const userId = req.user.userId;
		const requestedStartDate = typeof req.body?.period_start_date === "string" ? req.body.period_start_date.trim() : "";
		const requestedEndDateRaw = typeof req.body?.period_end_date === "string" ? req.body.period_end_date.trim() : "";
		const resolvedEndDate = requestedEndDateRaw || getTodayISODate();

		if (!isValidISODate(resolvedEndDate)) {
			return res.status(400).json({
				message: "period_end_date must be a valid date in YYYY-MM-DD format.",
			});
		}

		let targetQuery = `
			SELECT id, user_id, period_start_date, period_end_date, is_period_ongoing, cycle_length, flow_intensity, created_at
			FROM cycle_history
			WHERE user_id = $1 AND is_period_ongoing = TRUE AND period_end_date IS NULL
			ORDER BY period_start_date DESC
			LIMIT 1
		`;
		let targetValues = [userId];

		if (requestedStartDate) {
			if (!isValidISODate(requestedStartDate)) {
				return res.status(400).json({
					message: "period_start_date must be a valid date in YYYY-MM-DD format.",
				});
			}

			targetQuery = `
				SELECT id, user_id, period_start_date, period_end_date, is_period_ongoing, cycle_length, flow_intensity, created_at
				FROM cycle_history
				WHERE user_id = $1 AND period_start_date = $2
				LIMIT 1
			`;
			targetValues = [userId, requestedStartDate];
		}

		const targetResult = await pool.query(targetQuery, targetValues);
		const targetEntry = targetResult.rows[0];

		if (!targetEntry) {
			return res.status(404).json({
				message: "No ongoing period found to mark as ended.",
			});
		}

		if (toUTCDate(resolvedEndDate) < toUTCDate(normalizeDateForResponse(targetEntry.period_start_date))) {
			return res.status(400).json({
				message: "period_end_date cannot be earlier than period_start_date.",
			});
		}

		const updateQuery = `
			UPDATE cycle_history
			SET period_end_date = $1, is_period_ongoing = FALSE
			WHERE id = $2
			RETURNING id, user_id, period_start_date, period_end_date, is_period_ongoing, cycle_length, flow_intensity, created_at
		`;

		const updateResult = await pool.query(updateQuery, [resolvedEndDate, targetEntry.id]);
		const updatedEntry = updateResult.rows[0];

		const predictionRows = await getPredictionSourceRows(userId);
		const prediction = buildSafePredictionFromHistory(predictionRows, targetEntry.cycle_length);

		return res.status(200).json({
			message: "Period end marked successfully.",
			entry: mapCycleEntry(updatedEntry),
			prediction,
		});
	} catch (error) {
		console.error("Failed to mark period end", error);
		return res.status(500).json({
			message: "Failed to mark period end.",
		});
	}
}

async function getCycleStatus(req, res) {
	try {
		const userId = req.user.userId;

		const query = `
			SELECT id, user_id, period_start_date, period_end_date, is_period_ongoing, cycle_length, flow_intensity, created_at
			FROM cycle_history
			WHERE user_id = $1 AND is_period_ongoing = TRUE AND period_end_date IS NULL
			ORDER BY period_start_date DESC
			LIMIT 1
		`;

		const { rows } = await pool.query(query, [userId]);
		const activeEntry = rows[0] || null;

		if (!activeEntry) {
			return res.status(200).json({
				status: {
					periodStartDate: null,
					periodEndDate: null,
					isPeriodOngoing: false,
				},
				shouldPrompt: false,
			});
		}

		return res.status(200).json({
			status: {
				periodStartDate: normalizeDateForResponse(activeEntry.period_start_date),
				periodEndDate: normalizeDateForResponse(activeEntry.period_end_date),
				isPeriodOngoing: Boolean(activeEntry.is_period_ongoing),
			},
			shouldPrompt: true,
		});
	} catch (error) {
		console.error("Failed to fetch cycle status", error);
		return res.status(500).json({
			message: "Failed to fetch cycle status.",
		});
	}
}

async function getCycleHistory(req, res) {
	try {
		const userId = req.user.userId;

		const query = `
			SELECT id, user_id, period_start_date, period_end_date, is_period_ongoing, cycle_length, flow_intensity, created_at
			FROM cycle_history
			WHERE user_id = $1
			ORDER BY period_start_date DESC
		`;

		const { rows } = await pool.query(query, [userId]);
		const history = rows.map((row) => mapCycleEntry(row));

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
	markPeriodEnd,
	getCycleStatus,
	getCycleHistory,
};