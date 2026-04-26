const pool = require('../../config/db');
const logger = require('../../shared/utils/logger');

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

function parseOptionalNumber(value) {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return null;
	}

	return parsed;
}

function parseOptionalIntegerRange(value, min, max) {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
		return null;
	}

	return parsed;
}

function parseOptionalBoolean(value) {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	if (typeof value === "boolean") {
		return value;
	}

	if (typeof value === "string") {
		const normalized = value.trim().toLowerCase();
		if (normalized === "true") {
			return true;
		}
		if (normalized === "false") {
			return false;
		}
	}

	return null;
}

async function addDailyLog(req, res) {
	try {
		const userId = req.user.userId;
		const {
			log_date: logDate,
			mood,
			energy_level: energyLevel,
			stress_level: stressLevel,
			sleep_hours: sleepHours,
			cramps,
			headache,
			fatigue,
			bloating,
			water_intake: waterIntake,
			exercise_done: exerciseDone,
			notes,
		} = req.body;

		if (!logDate || !isValidISODate(logDate)) {
			return res.status(400).json({
				message: "log_date must be a valid date in YYYY-MM-DD format.",
			});
		}

		const normalizedEnergyLevel = parseOptionalIntegerRange(energyLevel, 1, 5);
		if (energyLevel !== undefined && normalizedEnergyLevel === null) {
			return res.status(400).json({
				message: "energy_level must be an integer between 1 and 5.",
			});
		}

		const normalizedStressLevel = parseOptionalIntegerRange(stressLevel, 1, 5);
		if (stressLevel !== undefined && normalizedStressLevel === null) {
			return res.status(400).json({
				message: "stress_level must be an integer between 1 and 5.",
			});
		}

		const normalizedSleepHours = parseOptionalNumber(sleepHours);
		if (sleepHours !== undefined && (normalizedSleepHours === null || normalizedSleepHours < 0 || normalizedSleepHours > 24)) {
			return res.status(400).json({
				message: "sleep_hours must be a number between 0 and 24.",
			});
		}

		const normalizedWaterIntake = parseOptionalNumber(waterIntake);
		if (waterIntake !== undefined && (normalizedWaterIntake === null || normalizedWaterIntake < 0)) {
			return res.status(400).json({
				message: "water_intake must be a non-negative number.",
			});
		}

		const normalizedCramps = parseOptionalBoolean(cramps);
		if (cramps !== undefined && normalizedCramps === null) {
			return res.status(400).json({
				message: "cramps must be true or false.",
			});
		}

		const normalizedHeadache = parseOptionalBoolean(headache);
		if (headache !== undefined && normalizedHeadache === null) {
			return res.status(400).json({
				message: "headache must be true or false.",
			});
		}

		const normalizedFatigue = parseOptionalBoolean(fatigue);
		if (fatigue !== undefined && normalizedFatigue === null) {
			return res.status(400).json({
				message: "fatigue must be true or false.",
			});
		}

		const normalizedBloating = parseOptionalBoolean(bloating);
		if (bloating !== undefined && normalizedBloating === null) {
			return res.status(400).json({
				message: "bloating must be true or false.",
			});
		}

		const normalizedExerciseDone = parseOptionalBoolean(exerciseDone);
		if (exerciseDone !== undefined && normalizedExerciseDone === null) {
			return res.status(400).json({
				message: "exercise_done must be true or false.",
			});
		}

		const query = `
			INSERT INTO daily_logs (
				user_id,
				log_date,
				mood,
				energy_level,
				stress_level,
				sleep_hours,
				cramps,
				headache,
				fatigue,
				bloating,
				water_intake,
				exercise_done,
				notes
			)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			ON CONFLICT (user_id, log_date)
			DO UPDATE SET
				mood = COALESCE(EXCLUDED.mood, daily_logs.mood),
				energy_level = COALESCE(EXCLUDED.energy_level, daily_logs.energy_level),
				stress_level = COALESCE(EXCLUDED.stress_level, daily_logs.stress_level),
				sleep_hours = COALESCE(EXCLUDED.sleep_hours, daily_logs.sleep_hours),
				cramps = COALESCE(EXCLUDED.cramps, daily_logs.cramps),
				headache = COALESCE(EXCLUDED.headache, daily_logs.headache),
				fatigue = COALESCE(EXCLUDED.fatigue, daily_logs.fatigue),
				bloating = COALESCE(EXCLUDED.bloating, daily_logs.bloating),
				water_intake = COALESCE(EXCLUDED.water_intake, daily_logs.water_intake),
				exercise_done = COALESCE(EXCLUDED.exercise_done, daily_logs.exercise_done),
				notes = COALESCE(EXCLUDED.notes, daily_logs.notes)
			RETURNING id, user_id, log_date, mood, energy_level, stress_level, sleep_hours, cramps, headache, fatigue, bloating, water_intake, exercise_done, notes, created_at
		`;

		const { rows } = await pool.query(query, [
			userId,
			logDate,
			mood ? String(mood).trim() : null,
			normalizedEnergyLevel,
			normalizedStressLevel,
			normalizedSleepHours,
			normalizedCramps,
			normalizedHeadache,
			normalizedFatigue,
			normalizedBloating,
			normalizedWaterIntake,
			normalizedExerciseDone,
			notes ? String(notes).trim() : null,
		]);

		const entry = rows[0];

		logger.info({ msg: "Daily log saved", userId, logDate });

		return res.status(201).json({
			message: "Daily log saved successfully.",
			entry: {
				...entry,
				log_date: normalizeDateForResponse(entry.log_date),
			},
		});
	} catch (error) {
		if (error.code === "23514") {
			return res.status(400).json({
				message: "One or more fields are out of allowed range.",
			});
		}

		logger.error({ msg: "Failed to save daily log", error: error.message });
		return res.status(500).json({
			message: "Failed to save daily log.",
		});
	}
}

async function getDailyLogs(req, res) {
	try {
		const userId = req.user.userId;
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

		const values = [userId];
		let whereClause = "WHERE user_id = $1";

		if (from) {
			values.push(from);
			whereClause += ` AND log_date >= $${values.length}`;
		}

		if (to) {
			values.push(to);
			whereClause += ` AND log_date <= $${values.length}`;
		}

		const query = `
			SELECT id, user_id, log_date, mood, energy_level, stress_level, sleep_hours, cramps, headache, fatigue, bloating, water_intake, exercise_done, notes, created_at
			FROM daily_logs
			${whereClause}
			ORDER BY log_date DESC, created_at DESC
		`;

		const { rows } = await pool.query(query, values);
		const entries = rows.map((row) => ({
			...row,
			log_date: normalizeDateForResponse(row.log_date),
		}));

		return res.status(200).json({
			entries,
		});
	} catch (error) {
		logger.error({ msg: "Failed to fetch daily logs", error: error.message });
		return res.status(500).json({
			message: "Failed to fetch daily logs.",
		});
	}
}

module.exports = {
	addDailyLog,
	getDailyLogs,
};
