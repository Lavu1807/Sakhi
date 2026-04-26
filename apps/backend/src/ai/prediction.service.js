const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DEFAULT_CALENDAR_RANGE_BEFORE_DAYS = 45;
const DEFAULT_CALENDAR_RANGE_AFTER_DAYS = 90;
const MAX_CALENDAR_RANGE_DAYS = 500;

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

function sanitizeDateRangeBoundary(value) {
	const parsed = parseDateValue(value);
	if (!parsed) {
		return null;
	}

	return parsed;
}

function resolveCalendarRange(options = {}) {
	const today = toUTCDateOnly(new Date());
	let fromDate = sanitizeDateRangeBoundary(options.from);
	let toDate = sanitizeDateRangeBoundary(options.to);

	if (!fromDate && !toDate) {
		fromDate = addDays(today, -DEFAULT_CALENDAR_RANGE_BEFORE_DAYS);
		toDate = addDays(today, DEFAULT_CALENDAR_RANGE_AFTER_DAYS);
	} else if (fromDate && !toDate) {
		toDate = addDays(fromDate, DEFAULT_CALENDAR_RANGE_AFTER_DAYS + DEFAULT_CALENDAR_RANGE_BEFORE_DAYS);
	} else if (!fromDate && toDate) {
		fromDate = addDays(toDate, -(DEFAULT_CALENDAR_RANGE_AFTER_DAYS + DEFAULT_CALENDAR_RANGE_BEFORE_DAYS));
	}

	if (fromDate > toDate) {
		const originalFrom = fromDate;
		fromDate = toDate;
		toDate = originalFrom;
	}

	const totalDays = Math.floor((toDate - fromDate) / DAY_IN_MILLISECONDS) + 1;
	if (totalDays > MAX_CALENDAR_RANGE_DAYS) {
		toDate = addDays(fromDate, MAX_CALENDAR_RANGE_DAYS - 1);
	}

	return {
		fromDate,
		toDate,
	};
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

function getFertileCycleDaySet(ovulationDay, cycleLength) {
	const normalizedOvulationDay = Math.max(1, Math.round(ovulationDay));
	const normalizedCycleLength = sanitizeCycleLength(cycleLength, 28);
	const fertileDays = new Set();

	for (let offset = -5; offset <= 1; offset += 1) {
		const day =
			((normalizedOvulationDay + offset - 1 + normalizedCycleLength * 2) % normalizedCycleLength) + 1;
		fertileDays.add(day);
	}

	return fertileDays;
}

function buildPhaseCalendar({ latestPeriodDate, cycleLengthUsed, fromDate, toDate }) {
	if (!latestPeriodDate || !fromDate || !toDate) {
		return [];
	}

	const normalizedCycleLength = sanitizeCycleLength(cycleLengthUsed, 28);
	const phaseCalendar = [];
	const currentDate = new Date(fromDate);
	const fertileDays = getFertileCycleDaySet(Math.max(1, normalizedCycleLength - 14), normalizedCycleLength);

	while (currentDate <= toDate) {
		const cycleDay = calculateCurrentDayInCycle(latestPeriodDate, normalizedCycleLength, currentDate);
		const phaseData = determineCurrentPhase(cycleDay, normalizedCycleLength, 5);

		phaseCalendar.push({
			date: formatDate(currentDate),
			cycleDay,
			phase: phaseData.currentPhase,
			isPeriod: cycleDay <= phaseData.menstrualEnd,
			isOvulation: cycleDay === phaseData.ovulationDay,
			isFertile: fertileDays.has(cycleDay),
		});

		currentDate.setUTCDate(currentDate.getUTCDate() + 1);
	}

	return phaseCalendar;
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

function buildPrediction(periodStartDates, defaultCycleLength = 28, options = {}) {
	const sortedDates = sortPeriodDates(periodStartDates);
	const normalizedFallbackCycleLength = sanitizeCycleLength(defaultCycleLength, 28);
	const calendarRange = resolveCalendarRange(options);
	const referencePeriodStartDate = parseDateValue(options.referencePeriodStartDate);
	const latestKnownPeriodDate = referencePeriodStartDate || sortedDates[sortedDates.length - 1] || null;
	const hasSufficientAdaptiveData = sortedDates.length >= 3;
	const isApproximatePrediction = !hasSufficientAdaptiveData;

	if (!latestKnownPeriodDate) {
		return {
			latestPeriodDate: null,
			nextPeriodDate: null,
			ovulationDate: null,
			fertileWindowStart: null,
			fertileWindowEnd: null,
			currentPhase: null,
			currentDay: null,
			ovulationDay: null,
			cycleLengthUsed: normalizedFallbackCycleLength,
			phaseMessage: null,
			averageCycleLength: normalizedFallbackCycleLength,
			confidenceLevel: "Low",
			irregularityFlag: false,
			cycleCount: 0,
			variation: 0,
			isApproximatePrediction: true,
			predictionMode: "approximate",
			phaseCalendar: [],
		};
	}

	const cycleLengths = calculateCycleLengths(sortedDates);
	const variation = calculateVariation(cycleLengths);
	const calculatedAverage = calculateAverageCycleLength(cycleLengths, normalizedFallbackCycleLength);

	// Until three period entries are available, keep using user/default cycle length.
	const adaptiveCycleLength = sanitizeCycleLength(
		isApproximatePrediction ? normalizedFallbackCycleLength : calculatedAverage,
		normalizedFallbackCycleLength,
	);

	const nextPeriodDate = addDays(latestKnownPeriodDate, adaptiveCycleLength);
	const ovulationDate = addDays(nextPeriodDate, -14);
	const fertileWindowStart = addDays(ovulationDate, -5);
	const fertileWindowEnd = addDays(ovulationDate, 1);
	const currentDay = calculateCurrentDayInCycle(latestKnownPeriodDate, adaptiveCycleLength);
	const phaseDetails = determineCurrentPhase(currentDay, adaptiveCycleLength, 5);
	const phaseCalendar = buildPhaseCalendar({
		latestPeriodDate: latestKnownPeriodDate,
		cycleLengthUsed: adaptiveCycleLength,
		fromDate: calendarRange.fromDate,
		toDate: calendarRange.toDate,
	});

	return {
		latestPeriodDate: formatDate(latestKnownPeriodDate),
		nextPeriodDate: formatDate(nextPeriodDate),
		ovulationDate: formatDate(ovulationDate),
		fertileWindowStart: formatDate(fertileWindowStart),
		fertileWindowEnd: formatDate(fertileWindowEnd),
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
		isApproximatePrediction,
		predictionMode: isApproximatePrediction ? "approximate" : "adaptive",
		phaseCalendar,
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
	buildPhaseCalendar,
	buildPrediction,
};
