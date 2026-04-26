export const CYCLE_STORAGE_KEY = "sakhi_cycle_prediction";

export const EMPTY_CYCLE_DATA = {
  lastDate: "",
  cycleLength: "",
  duration: "",
  nextPeriod: "",
  ovulationDate: "",
  fertileWindowStart: "",
  fertileWindowEnd: "",
  isApproximatePrediction: false,
  predictionMode: "",
  currentPhase: "",
  currentDay: "",
  ovulationDay: "",
  cycleLengthUsed: "",
  cycleCount: "",
  phaseMessage: "",
  confidenceLevel: "",
  irregularityFlag: null,
  variation: "",
};

export function parseInputDate(value) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDisplayDate(dateValue) {
  if (!dateValue) {
    return "--";
  }

  let date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    const [year, month, day] = dateValue.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(dateValue);
  }

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getCurrentPhase(lastPeriodDate, cycleLengthNumber) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(lastPeriodDate);
  start.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.floor((today - start) / millisecondsPerDay);
  const dayInCycle = ((totalDays % cycleLengthNumber) + cycleLengthNumber) % cycleLengthNumber + 1;
  const ovulationDay = cycleLengthNumber - 14 + 1;

  if (dayInCycle <= 5) {
    return "Menstrual Phase";
  }

  if (dayInCycle >= 6 && dayInCycle <= 13) {
    return "Follicular Phase";
  }

  if (Math.abs(dayInCycle - ovulationDay) <= 1) {
    return "Ovulation Phase";
  }

  return "Luteal Phase";
}

export function formatOvulationWindow(ovulationDateValue) {
  if (!ovulationDateValue) {
    return "--";
  }

  const ovulationDate = new Date(ovulationDateValue);
  if (Number.isNaN(ovulationDate.getTime())) {
    return "--";
  }

  const windowStart = addDays(ovulationDate, -1);
  const windowEnd = addDays(ovulationDate, 1);

  return `${formatDisplayDate(windowStart)} - ${formatDisplayDate(windowEnd)}`;
}

export function formatDateRange(startDateValue, endDateValue) {
  if (!startDateValue || !endDateValue) {
    return "--";
  }

  return `${formatDisplayDate(startDateValue)} - ${formatDisplayDate(endDateValue)}`;
}

function normalizeCycleData(data) {
  const variationValue = Number(data?.variation);
  const currentDayValue = Number(data?.currentDay);
  const ovulationDayValue = Number(data?.ovulationDay);
  const cycleLengthUsedValue = Number(data?.cycleLengthUsed);
  const cycleCountValue = Number(data?.cycleCount);

  return {
    ...EMPTY_CYCLE_DATA,
    lastDate: typeof data?.lastDate === "string" ? data.lastDate : "",
    cycleLength: data?.cycleLength ? String(data.cycleLength) : "",
    duration: data?.duration ? String(data.duration) : "",
    nextPeriod: typeof data?.nextPeriod === "string" ? data.nextPeriod : "",
    ovulationDate: typeof data?.ovulationDate === "string" ? data.ovulationDate : "",
    fertileWindowStart: typeof data?.fertileWindowStart === "string" ? data.fertileWindowStart : "",
    fertileWindowEnd: typeof data?.fertileWindowEnd === "string" ? data.fertileWindowEnd : "",
    isApproximatePrediction: Boolean(data?.isApproximatePrediction),
    predictionMode: typeof data?.predictionMode === "string" ? data.predictionMode : "",
    currentPhase: typeof data?.currentPhase === "string" ? data.currentPhase : "",
    currentDay: Number.isFinite(currentDayValue) ? currentDayValue : "",
    ovulationDay: Number.isFinite(ovulationDayValue) ? ovulationDayValue : "",
    cycleLengthUsed: Number.isFinite(cycleLengthUsedValue) ? cycleLengthUsedValue : "",
    cycleCount: Number.isFinite(cycleCountValue) ? cycleCountValue : "",
    phaseMessage: typeof data?.phaseMessage === "string" ? data.phaseMessage : "",
    confidenceLevel: typeof data?.confidenceLevel === "string" ? data.confidenceLevel : "",
    irregularityFlag: typeof data?.irregularityFlag === "boolean" ? data.irregularityFlag : null,
    variation: Number.isFinite(variationValue) ? variationValue : "",
  };
}

// Reads stored cycle details safely and returns fallback defaults when missing.
export function readCycleData() {
  const raw = localStorage.getItem(CYCLE_STORAGE_KEY);
  if (!raw) {
    return { ...EMPTY_CYCLE_DATA };
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizeCycleData(parsed);
  } catch {
    return { ...EMPTY_CYCLE_DATA };
  }
}

// Saves cycle inputs and predictions in a normalized shape for all pages.
export function saveCycleData(data) {
  const normalized = normalizeCycleData(data);
  localStorage.setItem(CYCLE_STORAGE_KEY, JSON.stringify(normalized));
}
