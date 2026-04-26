const MOODS = ["happy", "sad", "irritated", "anxious", "calm"];
const PHASES = ["Menstrual", "Follicular", "Ovulation", "Luteal"];
const MOOD_SCORE = {
	happy: 5,
	calm: 4,
	anxious: 2,
	irritated: 2,
	sad: 1,
};
const MOOD_SUGGESTIONS = {
	sad: ["Try relaxation exercises for a few minutes.", "Writing your thoughts in a short journal can help."],
	irritated: ["Try slow breathing exercises: inhale for 4 seconds, exhale for 6 seconds."],
	anxious: ["A short guided meditation can help calm your mind."],
};
const LOW_ENERGY_SUGGESTION = "Try light exercise like a short walk or gentle stretching.";
const LOW_MOOD_ALERT_MESSAGE = "You’ve been feeling low frequently. Consider self-care or talking to someone.";
const REPEATED_ANXIETY_ALERT_MESSAGE = "You’ve been feeling anxious repeatedly. Consider self-care or talking to someone.";

function createMoodCounter() {
	return {
		happy: 0,
		sad: 0,
		irritated: 0,
		anxious: 0,
		calm: 0,
	};
}

function normalizeMood(value) {
	const mood = String(value || "")
		.trim()
		.toLowerCase();

	return MOODS.includes(mood) ? mood : null;
}

function getEntryDateValue(entry) {
	const raw = entry?.date || entry?.entryDate || entry?.entry_date || "";
	const parsed = new Date(raw);

	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed.getTime();
}

function getEntryCycleDay(entry) {
	const rawValue = entry?.cycleDay !== undefined ? entry.cycleDay : entry?.cycle_day;
	const parsed = Number(rawValue);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		return null;
	}

	return parsed;
}

function getEntryIntensity(entry) {
	const parsed = Number(entry?.intensity);

	if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
		return null;
	}

	return parsed;
}

function getLatestEntry(entries) {
	if (!Array.isArray(entries) || entries.length === 0) {
		return null;
	}

	const cloned = [...entries];
	cloned.sort((a, b) => {
		const aDate = getEntryDateValue(a) || 0;
		const bDate = getEntryDateValue(b) || 0;

		if (bDate !== aDate) {
			return bDate - aDate;
		}

		const aCreated = new Date(a?.createdAt || a?.created_at || 0).getTime() || 0;
		const bCreated = new Date(b?.createdAt || b?.created_at || 0).getTime() || 0;
		return bCreated - aCreated;
	});

	return cloned[0] || null;
}

function normalizePhase(value) {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();

	if (!normalized) {
		return null;
	}

	if (normalized.includes("menstrual") || normalized.includes("period")) {
		return "Menstrual";
	}

	if (normalized.includes("follicular")) {
		return "Follicular";
	}

	if (normalized.includes("ovulation") || normalized.includes("ovulatory")) {
		return "Ovulation";
	}

	if (normalized.includes("luteal")) {
		return "Luteal";
	}

	return null;
}

function resolveDominantMood(moodFrequency) {
	let dominantMood = "";
	let maxCount = 0;

	for (const mood of MOODS) {
		const count = moodFrequency[mood] || 0;
		if (count > maxCount) {
			maxCount = count;
			dominantMood = mood;
		}
	}

	return dominantMood || "none";
}

function buildPhaseInsights(phaseMoodFrequency) {
	const insights = [];

	for (const phase of PHASES) {
		const phaseData = phaseMoodFrequency[phase];
		if (!phaseData || phaseData.total === 0) {
			continue;
		}

		let topMood = "";
		let topCount = 0;
		for (const mood of MOODS) {
			const count = phaseData[mood] || 0;
			if (count > topCount) {
				topMood = mood;
				topCount = count;
			}
		}

		if (!topMood) {
			continue;
		}

		const phaseName = phase.toLowerCase();
		if (phase === "Luteal" && ["sad", "irritated", "anxious"].includes(topMood)) {
			insights.push(`You often feel ${topMood} during ${phaseName} phase.`);
			continue;
		}

		if (phase === "Menstrual" && ["sad", "anxious"].includes(topMood)) {
			insights.push(`You often feel ${topMood} during ${phaseName} phase.`);
		}
	}

	return insights;
}

function getPhaseAverageScore(phaseData) {
	if (!phaseData || phaseData.total === 0) {
		return null;
	}

	let weightedScore = 0;
	for (const mood of MOODS) {
		weightedScore += (phaseData[mood] || 0) * (MOOD_SCORE[mood] || 0);
	}

	return weightedScore / phaseData.total;
}

function buildGeneralInsights({ moodFrequency, totalEntries, phaseMoodFrequency, frequentSadEntries, frequentIrritation }) {
	const insights = [];

	if (frequentSadEntries) {
		insights.push("You have frequent sad mood entries.");
	}

	if (frequentIrritation) {
		insights.push("You report irritation often.");
	}

	const ovulationAverage = getPhaseAverageScore(phaseMoodFrequency.Ovulation);
	const menstrualAverage = getPhaseAverageScore(phaseMoodFrequency.Menstrual);
	
	if (
		ovulationAverage !== null &&
		menstrualAverage !== null &&
		ovulationAverage - menstrualAverage >= 1
	) {
		insights.push("Your mood improves after ovulation.");
	}

	const menstrualData = phaseMoodFrequency.Menstrual;
	if (menstrualData && menstrualData.total > 0) {
		const lowMoodCount = (menstrualData.sad || 0) + (menstrualData.anxious || 0) + (menstrualData.irritated || 0);
		if (lowMoodCount / menstrualData.total >= 0.5) {
			insights.push("You feel low during menstrual phase.");
		}
	}

	if (totalEntries > 0 && insights.length === 0) {
		const positiveMoods = (moodFrequency.happy || 0) + (moodFrequency.calm || 0);
		if (positiveMoods / totalEntries >= 0.5) {
			insights.push("Your recent mood pattern looks mostly positive.");
		} else {
			insights.push("Your mood pattern is mixed; regular tracking can reveal clearer trends.");
		}
	}

	return insights;
}

function buildMoodSuggestions({ latestMood, latestIntensity, dominantMood }) {
	const suggestions = [];

	if (latestMood && Array.isArray(MOOD_SUGGESTIONS[latestMood])) {
		suggestions.push(...MOOD_SUGGESTIONS[latestMood]);
	}

	if (latestMood !== dominantMood && Array.isArray(MOOD_SUGGESTIONS[dominantMood])) {
		suggestions.push(...MOOD_SUGGESTIONS[dominantMood].slice(0, 1));
	}

	if (latestIntensity !== null && latestIntensity <= 2) {
		suggestions.push(LOW_ENERGY_SUGGESTION);
	}

	if (suggestions.length === 0) {
		suggestions.push("Keep tracking your mood daily to get more personalized support.");
	}

	return Array.from(new Set(suggestions));
}

function buildPersonalizedInsights(entries, dominantMood, latestMood) {
	const insights = [];

	let earlyTotal = 0;
	let lateTotal = 0;
	let earlyScore = 0;
	let lateScore = 0;

	for (const entry of entries) {
		const mood = normalizeMood(entry?.mood);
		if (!mood) {
			continue;
		}

		const cycleDay = getEntryCycleDay(entry);
		if (cycleDay === null) {
			continue;
		}

		const score = MOOD_SCORE[mood] || 0;
		if (cycleDay <= 10) {
			earlyTotal += 1;
			earlyScore += score;
		} else {
			lateTotal += 1;
			lateScore += score;
		}
	}

	if (earlyTotal > 0 && lateTotal > 0) {
		const earlyAverage = earlyScore / earlyTotal;
		const lateAverage = lateScore / lateTotal;

		if (lateAverage - earlyAverage >= 0.6) {
			insights.push("You usually feel better after day 10.");
		}
	}

	if (latestMood && dominantMood && dominantMood !== "none" && latestMood !== dominantMood) {
		const latestScore = MOOD_SCORE[latestMood] || 0;
		const dominantScore = MOOD_SCORE[dominantMood] || 0;

		if (latestScore < dominantScore) {
			insights.push(`You are feeling ${latestMood} today, but your usual pattern is more ${dominantMood}.`);
		}
	}

	return insights;
}

function buildEmotionalAlerts({ frequentSadEntries, frequentAnxiety }) {
	const alerts = [];

	if (frequentSadEntries) {
		alerts.push(LOW_MOOD_ALERT_MESSAGE);
	}

	if (frequentAnxiety) {
		alerts.push(REPEATED_ANXIETY_ALERT_MESSAGE);
	}

	return alerts;
}

function analyzeMood(data) {
	const entries = Array.isArray(data) ? data : [];
	const moodFrequency = createMoodCounter();
	const phaseMoodFrequency = {
		Menstrual: { ...createMoodCounter(), total: 0 },
		Follicular: { ...createMoodCounter(), total: 0 },
		Ovulation: { ...createMoodCounter(), total: 0 },
		Luteal: { ...createMoodCounter(), total: 0 },
	};

	let totalEntries = 0;

	for (const entry of entries) {
		const mood = normalizeMood(entry?.mood);
		if (!mood) {
			continue;
		}

		totalEntries += 1;
		moodFrequency[mood] += 1;

		const phase = normalizePhase(entry?.phase);
		if (phase) {
			phaseMoodFrequency[phase][mood] += 1;
			phaseMoodFrequency[phase].total += 1;
		}
	}

	const frequentSadEntries = moodFrequency.sad >= Math.max(3, Math.ceil(totalEntries * 0.3));
	const frequentIrritation = moodFrequency.irritated >= Math.max(3, Math.ceil(totalEntries * 0.3));
	const frequentAnxiety = moodFrequency.anxious >= Math.max(3, Math.ceil(totalEntries * 0.3));
	const dominantMood = resolveDominantMood(moodFrequency);
	const phaseInsights = buildPhaseInsights(phaseMoodFrequency);
	const latestEntry = getLatestEntry(entries);
	const latestMood = normalizeMood(latestEntry?.mood);
	const latestIntensity = getEntryIntensity(latestEntry);
	const baseInsights = buildGeneralInsights({
		moodFrequency,
		totalEntries,
		phaseMoodFrequency,
		frequentSadEntries,
		frequentIrritation,
	});
	const personalizedInsights = buildPersonalizedInsights(entries, dominantMood, latestMood);
	const insights = Array.from(new Set([...baseInsights, ...personalizedInsights]));
	const suggestions = buildMoodSuggestions({
		latestMood,
		latestIntensity,
		dominantMood,
	});
	const alerts = buildEmotionalAlerts({
		frequentSadEntries,
		frequentAnxiety,
	});

	return {
		dominantMood,
		moodFrequency,
		suggestions,
		patterns: {
			frequentSadEntries,
			frequentIrritation,
			frequentAnxiety,
		},
		phaseMoodFrequency,
		phaseInsights,
		insights,
		alerts,
		latestMood,
	};
}

module.exports = {
	analyzeMood,
};
