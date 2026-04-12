const { createMoodEntry, listMoodEntries } = require("../models/moodEntryModel");
const { analyzeMood } = require("../services/moodAnalyzer");

const MOODS = new Set(["happy", "sad", "irritated", "anxious", "calm"]);
const PHASE_MAP = {
	menstrual: "Menstrual",
	follicular: "Follicular",
	ovulation: "Ovulation",
	luteal: "Luteal",
};

function isValidISODate(dateString) {
	if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
		return false;
	}

	const date = new Date(`${dateString}T00:00:00.000Z`);
	return !Number.isNaN(date.getTime());
}

function parseRequiredIntegerRange(value, min, max) {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
		return null;
	}

	return parsed;
}

function parseOptionalPositiveInteger(value, defaultValue) {
	if (value === undefined || value === null || value === "") {
		return defaultValue;
	}

	const parsed = Number.parseInt(String(value), 10);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

function normalizeMood(mood) {
	const normalized = String(mood || "")
		.trim()
		.toLowerCase();

	return MOODS.has(normalized) ? normalized : null;
}

function normalizePhase(phase) {
	const normalized = String(phase || "")
		.trim()
		.toLowerCase();

	return PHASE_MAP[normalized] || null;
}

function normalizeNote(note) {
	if (note === undefined || note === null || note === "") {
		return null;
	}

	if (typeof note !== "string") {
		return null;
	}

	const trimmed = note.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.length > 500) {
		return null;
	}

	return trimmed;
}

async function addMoodEntry(req, res) {
	try {
		const userId = req.user.userId;
		const { date, mood, intensity, note, cycleDay, phase } = req.body;

		if (!isValidISODate(date)) {
			return res.status(400).json({
				message: "date must be a valid date in YYYY-MM-DD format.",
			});
		}

		const normalizedMood = normalizeMood(mood);
		if (!normalizedMood) {
			return res.status(400).json({
				message: "mood must be one of: happy, sad, irritated, anxious, calm.",
			});
		}

		const normalizedIntensity = parseRequiredIntegerRange(intensity, 1, 5);
		if (normalizedIntensity === null) {
			return res.status(400).json({
				message: "intensity must be an integer between 1 and 5.",
			});
		}

		const normalizedCycleDay = parseRequiredIntegerRange(cycleDay, 1, 60);
		if (normalizedCycleDay === null) {
			return res.status(400).json({
				message: "cycleDay must be an integer between 1 and 60.",
			});
		}

		const normalizedPhase = normalizePhase(phase);
		if (!normalizedPhase) {
			return res.status(400).json({
				message: "phase must be one of: Menstrual, Follicular, Ovulation, Luteal.",
			});
		}

		const normalizedNote = normalizeNote(note);
		if (note !== undefined && note !== null && note !== "" && normalizedNote === null) {
			return res.status(400).json({
				message: "note must be a string with up to 500 characters.",
			});
		}

		const entry = await createMoodEntry({
			userId,
			date,
			mood: normalizedMood,
			intensity: normalizedIntensity,
			note: normalizedNote,
			cycleDay: normalizedCycleDay,
			phase: normalizedPhase,
		});

		const history = await listMoodEntries({
			userId,
			limit: 365,
		});
		const analysis = analyzeMood(history);

		return res.status(201).json({
			message: "Mood entry saved successfully.",
			entry,
			analysis,
		});
	} catch (error) {
		if (error.code === "23505") {
			return res.status(409).json({
				message: "A mood entry already exists for this date.",
			});
		}

		if (error.code === "23514") {
			return res.status(400).json({
				message: "One or more mood fields are out of allowed range.",
			});
		}

		console.error("Failed to save mood entry", error);
		return res.status(500).json({
			message: "Failed to save mood entry.",
		});
	}
}

async function getMoodEntries(req, res) {
	try {
		const userId = req.user.userId;
		const { from, to, phase, limit } = req.query;

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

		let normalizedPhase = null;
		if (phase !== undefined) {
			normalizedPhase = normalizePhase(phase);
			if (!normalizedPhase) {
				return res.status(400).json({
					message: "phase must be one of: Menstrual, Follicular, Ovulation, Luteal.",
				});
			}
		}

		const normalizedLimit = parseOptionalPositiveInteger(limit, 100);
		if (normalizedLimit === null) {
			return res.status(400).json({
				message: "limit must be a positive integer.",
			});
		}

		const entries = await listMoodEntries({
			userId,
			from,
			to,
			phase: normalizedPhase,
			limit: normalizedLimit,
		});
		const analysis = analyzeMood(entries);

		return res.status(200).json({
			entries,
			analysis,
		});
	} catch (error) {
		console.error("Failed to fetch mood entries", error);
		return res.status(500).json({
			message: "Failed to fetch mood entries.",
		});
	}
}

module.exports = {
	addMoodEntry,
	getMoodEntries,
};
