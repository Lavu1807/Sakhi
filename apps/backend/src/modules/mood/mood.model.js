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
		mood: row.mood,
		intensity: row.intensity,
		note: row.note,
		cycleDay: row.cycle_day,
		phase: row.phase,
		createdAt: row.created_at,
	};
}

async function createMoodEntry({ userId, date, mood, intensity, note, cycleDay, phase }) {
	const query = `
		INSERT INTO mood_entries (
			user_id,
			entry_date,
			mood,
			intensity,
			note,
			cycle_day,
			phase
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, user_id, entry_date, mood, intensity, note, cycle_day, phase, created_at
	`;

	const { rows } = await pool.query(query, [userId, date, mood, intensity, note, cycleDay, phase]);
	return toResponseEntry(rows[0]);
}

async function listMoodEntries({ userId, from, to, phase, limit = 100 }) {
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
		SELECT id, user_id, entry_date, mood, intensity, note, cycle_day, phase, created_at
		FROM mood_entries
		WHERE ${whereConditions.join(" AND ")}
		ORDER BY entry_date DESC, created_at DESC
		LIMIT $${values.length}
	`;

	const { rows } = await pool.query(query, values);
	return rows.map((row) => toResponseEntry(row));
}

module.exports = {
	createMoodEntry,
	listMoodEntries,
};
