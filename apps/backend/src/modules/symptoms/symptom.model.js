const pool = require('../../config/db');

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

function toResponseEntry(row) {
	return {
		id: row.id,
		userId: row.user_id,
		date: normalizeDateForResponse(row.entry_date),
		cycleDay: row.cycle_day,
		phase: row.phase,
		painLevel: row.pain_level,
		flowLevel: row.flow_level,
		mood: row.mood,
		symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
		sleepHours: row.sleep_hours,
		activityLevel: row.activity_level,
		createdAt: row.created_at,
	};
}

async function createSymptomEntry({
	userId,
	date,
	cycleDay,
	phase,
	painLevel,
	flowLevel,
	mood,
	symptoms,
	sleepHours,
	activityLevel,
}) {
	const query = `
		INSERT INTO symptom_entries (
			user_id,
			entry_date,
			cycle_day,
			phase,
			pain_level,
			flow_level,
			mood,
			symptoms,
			sleep_hours,
			activity_level
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, user_id, entry_date, cycle_day, phase, pain_level, flow_level, mood, symptoms, sleep_hours, activity_level, created_at
	`;

	const { rows } = await pool.query(query, [
		userId,
		date,
		cycleDay,
		phase,
		painLevel,
		flowLevel,
		mood,
		symptoms,
		sleepHours,
		activityLevel,
	]);

	return toResponseEntry(rows[0]);
}

async function listSymptomEntries({ userId, from, to, phase, limit = 100 }) {
	const values = [userId];
	const whereConditions = ["user_id = $1"];

	if (from) {
		values.push(from);
		whereConditions.push(`entry_date >= $${values.length}`);
	}

	if (to) {
		values.push(to);
		whereConditions.push(`entry_date <= $${values.length}`);
	}

	if (phase) {
		values.push(phase);
		whereConditions.push(`phase = $${values.length}`);
	}

	const safeLimit = Number.isInteger(limit) ? Math.min(Math.max(limit, 1), 365) : 100;
	values.push(safeLimit);

	const query = `
		SELECT id, user_id, entry_date, cycle_day, phase, pain_level, flow_level, mood, symptoms, sleep_hours, activity_level, created_at
		FROM symptom_entries
		WHERE ${whereConditions.join(" AND ")}
		ORDER BY entry_date DESC, created_at DESC
		LIMIT $${values.length}
	`;

	const { rows } = await pool.query(query, values);
	return rows.map((row) => toResponseEntry(row));
}

module.exports = {
	createSymptomEntry,
	listSymptomEntries,
};