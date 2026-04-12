const { buildSymptomSuggestions } = require("./symptomSuggestionService");

function normalizeSymptoms(symptoms) {
	if (!Array.isArray(symptoms)) {
		return [];
	}

	return symptoms
		.map((item) => String(item || "").trim().toLowerCase())
		.filter(Boolean);
}

function normalizePhase(phase) {
	return String(phase || "")
		.trim()
		.toLowerCase();
}

function normalizeCycleDay(cycleDay) {
	const parsed = Number(cycleDay);

	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 60) {
		return null;
	}

	return parsed;
}

function resolveSeverity(painLevel) {
	const normalizedPainLevel = Number(painLevel);

	if (!Number.isFinite(normalizedPainLevel) || normalizedPainLevel <= 3) {
		return "mild";
	}

	if (normalizedPainLevel <= 7) {
		return "moderate";
	}

	return "severe";
}

function hasMoodSwings(symptomSet) {
	const moodSwingVariants = ["mood swings", "mood swing", "mood_swing", "mood_swings"];
	return moodSwingVariants.some((variant) => symptomSet.has(variant));
}

function formatSymptomLabel(symptom) {
	return String(symptom || "")
		.trim()
		.replace(/_/g, " ");
}

function hasDizziness(symptomSet) {
	const dizzinessVariants = ["dizziness", "dizzy"];
	return dizzinessVariants.some((variant) => symptomSet.has(variant));
}

function normalizeFlowLevel(flowLevel) {
	return String(flowLevel || "")
		.trim()
		.toLowerCase();
}

function extractHistoryEntries(data) {
	if (Array.isArray(data.history)) {
		return data.history;
	}

	if (Array.isArray(data.previousCycles)) {
		return data.previousCycles;
	}

	if (Array.isArray(data.cycleHistory)) {
		return data.cycleHistory;
	}

	if (data.history && Array.isArray(data.history.entries)) {
		return data.history.entries;
	}

	return [];
}

function normalizeHistoryEntries(data) {
	const historyEntries = extractHistoryEntries(data);

	return historyEntries
		.map((entry) => {
			const cycleDay = normalizeCycleDay(entry?.cycleDay ?? entry?.cycle_day);
			const symptoms = normalizeSymptoms(entry?.symptoms);

			return {
				cycleDay,
				symptoms,
			};
		})
		.filter((entry) => entry.cycleDay !== null && entry.symptoms.length > 0);
}

function isSevereEntry(entry) {
	if (!entry || typeof entry !== "object") {
		return false;
	}

	if (String(entry.severity || "").trim().toLowerCase() === "severe") {
		return true;
	}

	const entryPainLevel = Number(entry.painLevel ?? entry.pain_level);
	return Number.isFinite(entryPainLevel) && entryPainLevel > 7;
}

function hasRepeatedSevereSymptomsAcrossCycles(data, painLevel) {
	const historyEntries = extractHistoryEntries(data);
	const severeHistoryCount = historyEntries.filter((entry) => isSevereEntry(entry)).length;
	const currentIsSevere = Number.isFinite(painLevel) && painLevel > 7;

	if (severeHistoryCount >= 2) {
		return true;
	}

	return currentIsSevere && severeHistoryCount >= 1;
}

function addExpectedInsight(insights, message) {
	insights.push(`expected: ${message}`);
}

function addNeedsAttentionInsight(insights, message) {
	insights.push(`needs attention: ${message}`);
}

function addPersonalizedInsight(insights, message) {
	insights.push(`personalized: ${message}`);
}

function hasNeedsAttentionInsight(insights) {
	return insights.some((insight) => insight.startsWith("needs attention:"));
}

function splitInsights(insights) {
	const generalInsights = [];
	const personalizedInsights = [];

	for (const insight of insights) {
		if (String(insight).startsWith("personalized:")) {
			personalizedInsights.push(String(insight).replace(/^personalized:\s*/, ""));
			continue;
		}

		generalInsights.push(insight);
	}

	return {
		generalInsights,
		personalizedInsights,
	};
}

function addPersonalizedPatternInsights({ data, symptomSet, insights }) {
	const currentCycleDay = normalizeCycleDay(data.cycleDay ?? data.cycle_day);
	if (currentCycleDay === null || symptomSet.size === 0) {
		return;
	}

	const normalizedHistory = normalizeHistoryEntries(data);
	if (normalizedHistory.length === 0) {
		return;
	}

	const sameDayHistory = normalizedHistory.filter((entry) => entry.cycleDay === currentCycleDay);
	if (sameDayHistory.length < 2) {
		return;
	}

	for (const symptom of symptomSet) {
		const occurrenceCount = sameDayHistory.filter((entry) => entry.symptoms.includes(symptom)).length;
		const occurrenceRatio = occurrenceCount / sameDayHistory.length;

		if (occurrenceCount >= 2 && occurrenceRatio >= 0.6) {
			addPersonalizedInsight(insights, `You usually experience ${formatSymptomLabel(symptom)} on Day ${currentCycleDay}.`);
		}
	}
}

function buildRiskAssessment({ data, painLevel, severity, phaseAssessment, symptomSet, insights }) {
	const redFlags = [];
	const flowLevel = normalizeFlowLevel(data.flowLevel ?? data.flow_level);

	if (Number.isFinite(painLevel) && painLevel > 8) {
		redFlags.push("pain level is above 8");
	}

	if (flowLevel === "heavy" && hasDizziness(symptomSet)) {
		redFlags.push("heavy flow with dizziness is present");
	}

	if (hasRepeatedSevereSymptomsAcrossCycles(data, painLevel)) {
		redFlags.push("repeated severe symptoms across cycles are present");
	}

	for (const redFlag of redFlags) {
		addNeedsAttentionInsight(insights, `Red flag detected: ${redFlag}.`);
	}

	if (redFlags.length > 0) {
		return {
			risk: "high",
		};
	}

	if (severity === "severe" || phaseAssessment === "needs attention") {
		return {
			risk: "medium",
		};
	}

	return {
		risk: "low",
	};
}

function addPhaseAwareInsights({ phase, painLevel, severity, symptomSet, insights }) {
	if (phase === "menstrual") {
		if (symptomSet.has("cramps") && symptomSet.has("fatigue")) {
			addExpectedInsight(insights, "Cramps with fatigue is common during the menstrual phase.");
		} else if (symptomSet.size > 0) {
			addNeedsAttentionInsight(insights, "Current symptoms are not the most common menstrual pattern.");
		}

		if (painLevel > 7) {
			addNeedsAttentionInsight(insights, "Pain is severe for this phase and needs attention.");
		}

		return;
	}

	if (phase === "follicular") {
		if (symptomSet.size <= 1 && severity === "mild") {
			addExpectedInsight(insights, "Low symptom load in the follicular phase is usually normal.");
		} else {
			addNeedsAttentionInsight(insights, "Higher symptom burden in the follicular phase needs attention.");
		}

		return;
	}

	if (phase === "ovulation") {
		if (painLevel >= 1 && painLevel <= 3) {
			addExpectedInsight(insights, "Slight pain during ovulation can be normal.");
		} else if (painLevel > 3) {
			addNeedsAttentionInsight(insights, "Pain above slight range during ovulation needs attention.");
		}

		return;
	}

	if (phase === "luteal") {
		const moodSwingsPresent = hasMoodSwings(symptomSet);
		const bloatingPresent = symptomSet.has("bloating");

		if (moodSwingsPresent || bloatingPresent) {
			addExpectedInsight(insights, "Mood swings and bloating are common in the luteal phase.");
		} else if (symptomSet.size > 0) {
			addNeedsAttentionInsight(insights, "Symptoms in luteal phase do not match common luteal patterns.");
		}
	}
}

function analyzeSymptoms(data = {}) {
	const severity = resolveSeverity(data.painLevel);
	const normalizedSymptoms = normalizeSymptoms(data.symptoms);
	const symptomSet = new Set(normalizedSymptoms);
	const phase = normalizePhase(data.phase);
	const painLevel = Number(data.painLevel);
	const insights = [];

	addPhaseAwareInsights({
		phase,
		painLevel,
		severity,
		symptomSet,
		insights,
	});

	if (symptomSet.has("headache") && symptomSet.has("nausea")) {
		addNeedsAttentionInsight(insights, "Headache with nausea may reflect a possible hormonal effect.");
	}

	addPersonalizedPatternInsights({
		data,
		symptomSet,
		insights,
	});

	if (insights.length === 0) {
		if (severity === "mild") {
			addExpectedInsight(insights, "No major concerning pattern detected from the current symptoms.");
		} else {
			addNeedsAttentionInsight(insights, "Symptom pattern is not clearly phase-expected and needs attention.");
		}
	}

	const phaseAssessment = hasNeedsAttentionInsight(insights) ? "needs attention" : "expected";
	const { risk } = buildRiskAssessment({
		data,
		painLevel,
		severity,
		phaseAssessment,
		symptomSet,
		insights,
	});

	if (risk === "high") {
		addNeedsAttentionInsight(insights, "High-risk pattern detected. Please consult a healthcare professional.");
	}

	const { suggestions } = buildSymptomSuggestions({
		symptoms: normalizedSymptoms,
	});
	const { generalInsights, personalizedInsights } = splitInsights(insights);

	return {
		severity,
		risk,
		insights: generalInsights,
		suggestions,
		personalizedInsights,
	};
}

module.exports = {
	analyzeSymptoms,
};