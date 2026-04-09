const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

const PHASE_MESSAGES = {
	Menstrual: "Prioritize rest, hydration, and gentle care today.",
	Follicular: "Energy may rise now; this is a good time for planning and activity.",
	Ovulation: "You may feel more energetic and confident around ovulation.",
	Luteal: "Focus on steady routines, sleep, and stress support in this phase.",
};

function parseDateValue(value) {
	if (!value) {
		return null;
	}

	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		const [year, month, day] = value.split("-").map(Number);
		const date = new Date(Date.UTC(year, month - 1, day));
		return Number.isNaN(date.getTime()) ? null : date;
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDate(date) {
	return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
	const result = new Date(date);
	result.setUTCDate(result.getUTCDate() + days);
	return result;
}

function toUTCDateOnly(date) {
	return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function sanitizeCycleLength(value, fallback = 28) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0) {
		return Math.max(1, Math.round(fallback));
	}

	return Math.max(1, Math.round(parsed));
}

function sortPeriodDates(periodStartDates) {
	const parsed = periodStartDates.map(parseDateValue).filter(Boolean);

	const uniqueByTimestamp = [];
	const seen = new Set();

	for (const date of parsed) {
		const stamp = date.getTime();
		if (!seen.has(stamp)) {
			seen.add(stamp);
			uniqueByTimestamp.push(date);
		}
	}

	return uniqueByTimestamp.sort((a, b) => a.getTime() - b.getTime());
}

function calculateCycleLengths(sortedPeriodDates) {
	const cycleLengths = [];

	for (let index = 1; index < sortedPeriodDates.length; index += 1) {
		const current = sortedPeriodDates[index];
		const previous = sortedPeriodDates[index - 1];
		const differenceInDays = Math.round((current - previous) / DAY_IN_MILLISECONDS);

		if (differenceInDays > 0) {
			cycleLengths.push(differenceInDays);
		}
	}

	return cycleLengths;
}

function calculateAverageCycleLength(cycleLengths, fallbackCycleLength = 28) {
	if (!cycleLengths.length) {
		return fallbackCycleLength;
	}

	const total = cycleLengths.reduce((sum, length) => sum + length, 0);
	return Math.round(total / cycleLengths.length);
}

function calculateVariation(cycleLengths) {
	if (!cycleLengths.length) {
		return 0;
	}

	return Math.max(...cycleLengths) - Math.min(...cycleLengths);
}

function getConfidenceLevel(cycleCount, variation) {
	if (cycleCount < 3) {
		return "Low";
	}

	if (variation <= 2) {
		return "High";
	}

	if (variation <= 5) {
		return "Medium";
	}

	return "Low";
}

function calculateCurrentDayInCycle(lastPeriodDate, cycleLengthUsed, referenceDate = new Date()) {
	const cycleLength = sanitizeCycleLength(cycleLengthUsed, 28);
	const referenceUTCDate = toUTCDateOnly(referenceDate);
	const elapsedDays = Math.floor((referenceUTCDate - lastPeriodDate) / DAY_IN_MILLISECONDS);

	// Keep day in the [1, cycleLength] range even if date goes beyond one full cycle.
	return ((elapsedDays % cycleLength) + cycleLength) % cycleLength + 1;
}

function determineCurrentPhase(currentDay, cycleLengthUsed, menstrualLength = 5) {
	const cycleLength = sanitizeCycleLength(cycleLengthUsed, 28);
	const menstrualEnd = Math.min(Math.max(1, menstrualLength), cycleLength);
	const ovulationDay = Math.max(1, cycleLength - 14);

	if (currentDay <= menstrualEnd) {
		return {
			currentPhase: "Menstrual",
			ovulationDay,
			menstrualEnd,
			phaseMessage: PHASE_MESSAGES.Menstrual,
		};
	}

	if (currentDay < ovulationDay) {
		return {
			currentPhase: "Follicular",
			ovulationDay,
			menstrualEnd,
			phaseMessage: PHASE_MESSAGES.Follicular,
		};
	}

	if (currentDay === ovulationDay) {
		return {
			currentPhase: "Ovulation",
			ovulationDay,
			menstrualEnd,
			phaseMessage: PHASE_MESSAGES.Ovulation,
		};
	}

	return {
		currentPhase: "Luteal",
		ovulationDay,
		menstrualEnd,
		phaseMessage: PHASE_MESSAGES.Luteal,
	};
}

function buildPrediction(periodStartDates, defaultCycleLength = 28) {
	const sortedDates = sortPeriodDates(periodStartDates);

	if (!sortedDates.length) {
		return {
			nextPeriodDate: null,
			ovulationDate: null,
			currentPhase: null,
			currentDay: null,
			ovulationDay: null,
			cycleLengthUsed: sanitizeCycleLength(defaultCycleLength, 28),
			phaseMessage: null,
			averageCycleLength: defaultCycleLength,
			confidenceLevel: "Low",
			irregularityFlag: false,
			cycleCount: 0,
			variation: 0,
		};
	}

	const cycleLengths = calculateCycleLengths(sortedDates);
	const variation = calculateVariation(cycleLengths);
	const calculatedAverage = calculateAverageCycleLength(cycleLengths, defaultCycleLength);

	// Until three period entries are available, keep using user/default cycle length.
	const adaptiveCycleLength = sanitizeCycleLength(
		sortedDates.length < 3 ? defaultCycleLength : calculatedAverage,
		defaultCycleLength,
	);

	const latestPeriodDate = sortedDates[sortedDates.length - 1];
	const nextPeriodDate = addDays(latestPeriodDate, adaptiveCycleLength);
	const ovulationDate = addDays(nextPeriodDate, -14);
	const currentDay = calculateCurrentDayInCycle(latestPeriodDate, adaptiveCycleLength);
	const phaseDetails = determineCurrentPhase(currentDay, adaptiveCycleLength, 5);

	return {
		latestPeriodDate: formatDate(latestPeriodDate),
		nextPeriodDate: formatDate(nextPeriodDate),
		ovulationDate: formatDate(ovulationDate),
		currentPhase: phaseDetails.currentPhase,
		currentDay,
		ovulationDay: phaseDetails.ovulationDay,
		cycleLengthUsed: adaptiveCycleLength,
		phaseMessage: phaseDetails.phaseMessage,
		averageCycleLength: adaptiveCycleLength,
		confidenceLevel: getConfidenceLevel(sortedDates.length, variation),
		irregularityFlag: variation > 5,
		cycleCount: sortedDates.length,
		variation,
	};
}

module.exports = {
	sortPeriodDates,
	calculateCycleLengths,
	calculateAverageCycleLength,
	calculateVariation,
	getConfidenceLevel,
	calculateCurrentDayInCycle,
	determineCurrentPhase,
	buildPrediction,
};
