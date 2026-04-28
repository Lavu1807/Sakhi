const { buildPrediction } = require("../../ai/prediction.service");

function normalizeDateForPrediction(value) {
	if (!value) {
		return null;
	}

	if (typeof value === "string") {
		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			return value;
		}

		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
	}

	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
	}

	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function getLatestDateValue(dateA, dateB) {
	if (!dateA) {
		return dateB;
	}

	if (!dateB) {
		return dateA;
	}

	return dateA > dateB ? dateA : dateB;
}

function recalculateCycle({ rows = [], preferredCycleLength, from, to } = {}) {
	const completeCycleStartDates = [];
	let latestPeriodStartDate = null;

	for (const row of rows || []) {
		const startDate = normalizeDateForPrediction(row?.period_start_date);
		const endDate = normalizeDateForPrediction(row?.period_end_date);

		if (startDate) {
			latestPeriodStartDate = getLatestDateValue(latestPeriodStartDate, startDate);
		}

		if (startDate && endDate) {
			completeCycleStartDates.push(startDate);
		}
	}

	return buildPrediction(completeCycleStartDates, preferredCycleLength, {
		from,
		to,
		referencePeriodStartDate: latestPeriodStartDate,
	});
}

module.exports = {
	recalculateCycle,
	normalizeDateForPrediction,
};
