const {
	sortPeriodDates,
	calculateCycleLengths,
	calculateAverageCycleLength,
	calculateVariation,
	getConfidenceLevel,
	calculateCurrentDayInCycle,
	determineCurrentPhase,
	buildPhaseCalendar,
	buildPrediction,
} = require('../../src/ai/prediction.service');

describe("predictionUtils", () => {
	describe("sortPeriodDates", () => {
		it("should sort dates in ascending order", () => {
			const result = sortPeriodDates(["2024-03-01", "2024-01-01", "2024-02-01"]);
			expect(result).toHaveLength(3);
			expect(result[0].toISOString().slice(0, 10)).toBe("2024-01-01");
			expect(result[2].toISOString().slice(0, 10)).toBe("2024-03-01");
		});

		it("should deduplicate dates", () => {
			const result = sortPeriodDates(["2024-01-01", "2024-01-01", "2024-02-01"]);
			expect(result).toHaveLength(2);
		});

		it("should filter out invalid dates", () => {
			const result = sortPeriodDates(["2024-01-01", "invalid", null, "2024-02-01"]);
			expect(result).toHaveLength(2);
		});

		it("should return empty array for empty input", () => {
			const result = sortPeriodDates([]);
			expect(result).toHaveLength(0);
		});
	});

	describe("calculateCycleLengths", () => {
		it("should calculate differences between consecutive dates", () => {
			const dates = sortPeriodDates(["2024-01-01", "2024-01-29", "2024-02-26"]);
			const lengths = calculateCycleLengths(dates);
			expect(lengths).toEqual([28, 28]);
		});

		it("should return empty array for single date", () => {
			const dates = sortPeriodDates(["2024-01-01"]);
			const lengths = calculateCycleLengths(dates);
			expect(lengths).toEqual([]);
		});

		it("should return empty array for no dates", () => {
			const lengths = calculateCycleLengths([]);
			expect(lengths).toEqual([]);
		});
	});

	describe("calculateAverageCycleLength", () => {
		it("should calculate average correctly", () => {
			expect(calculateAverageCycleLength([28, 30, 26])).toBe(28);
		});

		it("should return fallback for empty array", () => {
			expect(calculateAverageCycleLength([])).toBe(28);
			expect(calculateAverageCycleLength([], 30)).toBe(30);
		});
	});

	describe("calculateVariation", () => {
		it("should return max minus min", () => {
			expect(calculateVariation([26, 28, 30])).toBe(4);
		});

		it("should return 0 for identical values", () => {
			expect(calculateVariation([28, 28, 28])).toBe(0);
		});

		it("should return 0 for empty array", () => {
			expect(calculateVariation([])).toBe(0);
		});
	});

	describe("getConfidenceLevel", () => {
		it("should return Low for fewer than 3 cycles", () => {
			expect(getConfidenceLevel(2, 0)).toBe("Low");
			expect(getConfidenceLevel(1, 0)).toBe("Low");
		});

		it("should return High for 3+ cycles with variation <= 2", () => {
			expect(getConfidenceLevel(3, 0)).toBe("High");
			expect(getConfidenceLevel(5, 2)).toBe("High");
		});

		it("should return Medium for variation <= 5", () => {
			expect(getConfidenceLevel(3, 4)).toBe("Medium");
		});

		it("should return Low for high variation", () => {
			expect(getConfidenceLevel(3, 10)).toBe("Low");
		});
	});

	describe("calculateCurrentDayInCycle", () => {
		it("should return 1 on the period start date", () => {
			const today = new Date(Date.UTC(2024, 0, 1));
			const lastPeriod = new Date(Date.UTC(2024, 0, 1));
			expect(calculateCurrentDayInCycle(lastPeriod, 28, today)).toBe(1);
		});

		it("should calculate mid-cycle correctly", () => {
			const lastPeriod = new Date(Date.UTC(2024, 0, 1));
			const reference = new Date(Date.UTC(2024, 0, 15));
			expect(calculateCurrentDayInCycle(lastPeriod, 28, reference)).toBe(15);
		});

		it("should wrap around after cycle length", () => {
			const lastPeriod = new Date(Date.UTC(2024, 0, 1));
			const reference = new Date(Date.UTC(2024, 0, 29)); // Day 29 of a 28-day cycle
			expect(calculateCurrentDayInCycle(lastPeriod, 28, reference)).toBe(1);
		});
	});

	describe("determineCurrentPhase", () => {
		it("should detect Menstrual phase for days 1-5", () => {
			const result = determineCurrentPhase(1, 28, 5);
			expect(result.currentPhase).toBe("Menstrual");
		});

		it("should detect Follicular phase", () => {
			const result = determineCurrentPhase(7, 28, 5);
			expect(result.currentPhase).toBe("Follicular");
		});

		it("should detect Ovulation phase", () => {
			const result = determineCurrentPhase(14, 28, 5);
			expect(result.currentPhase).toBe("Ovulation");
		});

		it("should detect Luteal phase", () => {
			const result = determineCurrentPhase(20, 28, 5);
			expect(result.currentPhase).toBe("Luteal");
		});

		it("should include phaseMessage", () => {
			const result = determineCurrentPhase(1, 28, 5);
			expect(result.phaseMessage).toBeDefined();
			expect(typeof result.phaseMessage).toBe("string");
		});
	});

	describe("buildPhaseCalendar", () => {
		it("should generate calendar entries for the date range", () => {
			const result = buildPhaseCalendar({
				latestPeriodDate: new Date(Date.UTC(2024, 0, 1)),
				cycleLengthUsed: 28,
				fromDate: new Date(Date.UTC(2024, 0, 1)),
				toDate: new Date(Date.UTC(2024, 0, 5)),
			});

			expect(result).toHaveLength(5);
			expect(result[0].date).toBe("2024-01-01");
			expect(result[0].cycleDay).toBe(1);
			expect(result[0].phase).toBe("Menstrual");
			expect(result[0].isPeriod).toBe(true);
		});

		it("should return empty array when inputs are missing", () => {
			expect(buildPhaseCalendar({})).toEqual([]);
		});
	});

	describe("buildPrediction", () => {
		it("should return null fields when no dates provided", () => {
			const result = buildPrediction([], 28);
			expect(result.latestPeriodDate).toBeNull();
			expect(result.nextPeriodDate).toBeNull();
			expect(result.confidenceLevel).toBe("Low");
			expect(result.isApproximatePrediction).toBe(true);
		});

		it("should return approximate prediction for fewer than 3 dates", () => {
			const result = buildPrediction(["2024-01-01", "2024-01-29"], 28);
			expect(result.predictionMode).toBe("approximate");
			expect(result.isApproximatePrediction).toBe(true);
			expect(result.latestPeriodDate).toBe("2024-01-29");
		});

		it("should return adaptive prediction for 3+ dates", () => {
			const result = buildPrediction(["2024-01-01", "2024-01-29", "2024-02-26"], 28);
			expect(result.predictionMode).toBe("adaptive");
			expect(result.isApproximatePrediction).toBe(false);
			expect(result.cycleCount).toBe(3);
		});

		it("should include phaseCalendar in output", () => {
			const result = buildPrediction(["2024-01-01"], 28);
			expect(Array.isArray(result.phaseCalendar)).toBe(true);
		});

		it("should set correct output shape", () => {
			const result = buildPrediction(["2024-01-01"], 28);
			expect(result).toHaveProperty("latestPeriodDate");
			expect(result).toHaveProperty("nextPeriodDate");
			expect(result).toHaveProperty("ovulationDate");
			expect(result).toHaveProperty("fertileWindowStart");
			expect(result).toHaveProperty("fertileWindowEnd");
			expect(result).toHaveProperty("currentPhase");
			expect(result).toHaveProperty("currentDay");
			expect(result).toHaveProperty("cycleLengthUsed");
			expect(result).toHaveProperty("confidenceLevel");
			expect(result).toHaveProperty("variation");
		});
	});
});
