const { createSymptomEntry, listSymptomEntries } = require('./symptom.model');
const { analyzeSymptoms } = require('./symptom.service');

const FLOW_LEVELS = new Set(["light", "medium", "heavy"]);
const MOODS = new Set(["happy", "sad", "irritated", "anxious"]);
const ACTIVITY_LEVELS = new Set(["low", "moderate", "high"]);
const ALLOWED_SYMPTOMS = new Set(["cramps", "fatigue", "headache", "nausea", "bloating"]);
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

function parseRequiredNumberRange(value, min, max) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
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

function normalizePhase(phase) {
	const normalized = String(phase || "")
		.trim()
		.toLowerCase();

	return PHASE_MAP[normalized] || null;
}

function normalizeEnum(value, allowedSet) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();

	return allowedSet.has(normalized) ? normalized : null;
}

function normalizeSymptoms(symptoms) {
	if (!Array.isArray(symptoms)) {
		return null;
	}

	const normalizedSymptoms = symptoms.map((item) => String(item || "").trim().toLowerCase());

	if (normalizedSymptoms.some((item) => !item || !ALLOWED_SYMPTOMS.has(item))) {
		return null;
	}

	return Array.from(new Set(normalizedSymptoms));
}

async function addSymptomEntry(req, res) {
	try {
		const userId = req.user.userId;
		const {
			date,
			cycleDay,
			phase,
			painLevel,
			flowLevel,
			mood,
			symptoms,
			sleepHours,
			activityLevel,
		} = req.body;

		if (!isValidISODate(date)) {
			return res.status(400).json({
				message: "date must be a valid date in YYYY-MM-DD format.",
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

		const normalizedPainLevel = parseRequiredIntegerRange(painLevel, 1, 10);
		if (normalizedPainLevel === null) {
			return res.status(400).json({
				message: "painLevel must be an integer between 1 and 10.",
			});
		}

		const normalizedFlowLevel = normalizeEnum(flowLevel, FLOW_LEVELS);
		if (!normalizedFlowLevel) {
			return res.status(400).json({
				message: "flowLevel must be one of: light, medium, heavy.",
			});
		}

		const normalizedMood = normalizeEnum(mood, MOODS);
		if (!normalizedMood) {
			return res.status(400).json({
				message: "mood must be one of: happy, sad, irritated, anxious.",
			});
		}

		const normalizedSymptoms = normalizeSymptoms(symptoms);
		if (!normalizedSymptoms) {
			return res.status(400).json({
				message: "symptoms must be an array containing only: cramps, fatigue, headache, nausea, bloating.",
			});
		}

		const normalizedSleepHours = parseRequiredNumberRange(sleepHours, 0, 24);
		if (normalizedSleepHours === null) {
			return res.status(400).json({
				message: "sleepHours must be a number between 0 and 24.",
			});
		}

		const normalizedActivityLevel = normalizeEnum(activityLevel, ACTIVITY_LEVELS);
		if (!normalizedActivityLevel) {
			return res.status(400).json({
				message: "activityLevel must be one of: low, moderate, high.",
			});
		}

		const pastEntries = await listSymptomEntries({
			userId,
			limit: 365,
		});

		const entry = await createSymptomEntry({
			userId,
			date,
			cycleDay: normalizedCycleDay,
			phase: normalizedPhase,
			painLevel: normalizedPainLevel,
			flowLevel: normalizedFlowLevel,
			mood: normalizedMood,
			symptoms: normalizedSymptoms,
			sleepHours: normalizedSleepHours,
			activityLevel: normalizedActivityLevel,
		});

		const analysis = analyzeSymptoms({
			painLevel: normalizedPainLevel,
			symptoms: normalizedSymptoms,
			phase: normalizedPhase,
			flowLevel: normalizedFlowLevel,
			cycleDay: normalizedCycleDay,
			history: pastEntries,
		});

		return res.status(201).json({
			message: "Symptom entry saved successfully.",
			entry,
			analysis,
			suggestions: analysis.suggestions,
		});
	} catch (error) {
		if (error.code === "23505") {
			return res.status(409).json({
				message: "A symptom entry already exists for this date.",
			});
		}

		if (error.code === "23514") {
			return res.status(400).json({
				message: "One or more symptom fields are out of allowed range.",
			});
		}

		console.error("Failed to save symptom entry", error);
		return res.status(500).json({
			message: "Failed to save symptom entry.",
		});
	}
}

async function getSymptomEntries(req, res) {
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

		const entries = await listSymptomEntries({
			userId,
			from,
			to,
			phase: normalizedPhase,
			limit: normalizedLimit,
		});

		return res.status(200).json({
			entries,
		});
	} catch (error) {
		console.error("Failed to fetch symptom entries", error);
		return res.status(500).json({
			message: "Failed to fetch symptom entries.",
		});
	}
}

module.exports = {
	addSymptomEntry,
	getSymptomEntries,
};