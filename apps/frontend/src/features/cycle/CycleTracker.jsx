import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { addCycleEntry, getCycleHistory, getPrediction } from "../../shared/utils/api";
import { getAuthToken } from "../../shared/utils/auth";
import {
  formatDateRange,
  formatDisplayDate,
  readCycleData,
  saveCycleData,
} from "./cycleUtils";

function isValidISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function parsePastPeriodDates(input) {
  if (!input || typeof input !== "string") {
    return [];
  }

  const candidates = input
    .split(/[\n,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const uniqueDates = Array.from(new Set(candidates)).filter((item) => isValidISODate(item));
  return uniqueDates.sort();
}

function mapInputMethodLabel(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "multiple-period-dates") {
    return "Multiple Past Dates";
  }

  if (normalized === "last-period-and-cycle-length") {
    return "Last Period + Cycle Length";
  }

  if (normalized === "direct-calendar-mark") {
    return "Calendar Marking";
  }

  return "Last Period Date";
}

export default function CycleTracker() {
  const [lastDate, setLastDate] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [pastPeriodDatesInput, setPastPeriodDatesInput] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [inputMethod, setInputMethod] = useState("");
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedCycleData = readCycleData();
    const token = getAuthToken();

    setLastDate(storedCycleData.lastDate);
    setCycleLength(storedCycleData.cycleLength);

    if (storedCycleData.nextPeriod && storedCycleData.ovulationDate) {
      setResult({
        nextPeriodDate: storedCycleData.nextPeriod,
        ovulationDate: storedCycleData.ovulationDate,
        currentPhase: storedCycleData.currentPhase,
        currentDay: storedCycleData.currentDay,
        ovulationDay: storedCycleData.ovulationDay,
        cycleLengthUsed: storedCycleData.cycleLengthUsed,
        cycleCount: storedCycleData.cycleCount,
        phaseMessage: storedCycleData.phaseMessage,
        confidenceLevel: storedCycleData.confidenceLevel,
        irregularityFlag: storedCycleData.irregularityFlag,
      });
    }

    async function loadHistory() {
      if (!token) {
        return;
      }

      try {
        const response = await getCycleHistory(token);
        setHistory(response.entries || []);
      } catch {
        setHistory([]);
      }
    }

    loadHistory();
  }, []);

  async function handleCalculate(event) {
    event.preventDefault();

    const validationErrors = {};
    const parsedPastDates = parsePastPeriodDates(pastPeriodDatesInput);
    const hasMultiplePastDates = parsedPastDates.length >= 2;
    const cycleLengthValue = cycleLength.trim();
    const cycleLengthNumber = cycleLengthValue ? Number(cycleLengthValue) : null;

    if (!hasMultiplePastDates && !lastDate) {
      validationErrors.lastDate = "Provide last period date or at least 2 past dates.";
    }

    if (cycleLengthValue && (!Number.isFinite(cycleLengthNumber) || cycleLengthNumber <= 0)) {
      validationErrors.cycleLength = "Cycle length must be a positive number.";
    }

    if (pastPeriodDatesInput.trim().length > 0 && parsedPastDates.length < 2 && !lastDate) {
      validationErrors.pastPeriodDates = "Add at least 2 valid dates (YYYY-MM-DD) for multiple-date input.";
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setApiError("Your session has expired. Please login again.");
      return;
    }

    setApiError("");
    setIsSubmitting(true);

    try {
      const payload = hasMultiplePastDates
        ? {
            period_start_dates: Array.from(new Set([...(lastDate ? [lastDate] : []), ...parsedPastDates])).sort(),
            cycle_length: Number.isFinite(cycleLengthNumber) ? Math.round(cycleLengthNumber) : undefined,
          }
        : {
            period_start_date: lastDate,
            cycle_length: Number.isFinite(cycleLengthNumber) ? Math.round(cycleLengthNumber) : undefined,
          };

      const addEntryResponse = await addCycleEntry(payload, token);

      const predictionFallbackLength = Number.isFinite(cycleLengthNumber)
        ? Math.round(cycleLengthNumber)
        : Number.isFinite(Number(addEntryResponse?.initialCycleLengthEstimate))
          ? Number(addEntryResponse.initialCycleLengthEstimate)
          : undefined;

      const prediction = await getPrediction(token, {
        defaultCycleLength: predictionFallbackLength,
      });

      const currentDay = Number.isFinite(Number(prediction.currentDay)) ? Number(prediction.currentDay) : "";
      const ovulationDay = Number.isFinite(Number(prediction.ovulationDay)) ? Number(prediction.ovulationDay) : "";
      const cycleLengthUsed = Number.isFinite(Number(prediction.cycleLengthUsed))
        ? Number(prediction.cycleLengthUsed)
        : "";
      const cycleCount = Number.isFinite(Number(prediction.cycleCount)) ? Number(prediction.cycleCount) : "";
      const phaseMessage = typeof prediction.phaseMessage === "string" ? prediction.phaseMessage : "";

      setInputMethod(mapInputMethodLabel(addEntryResponse?.inputMethod));

      saveCycleData({
        lastDate: prediction.latestPeriodDate || lastDate,
        cycleLength: Number.isFinite(Number(prediction.averageCycleLength))
          ? Number(prediction.averageCycleLength)
          : cycleLength,
        nextPeriod: prediction.nextPeriodDate || "",
        ovulationDate: prediction.ovulationDate || "",
        fertileWindowStart: prediction.fertileWindowStart || "",
        fertileWindowEnd: prediction.fertileWindowEnd || "",
        isApproximatePrediction: Boolean(prediction.isApproximatePrediction),
        predictionMode: typeof prediction.predictionMode === "string" ? prediction.predictionMode : "",
        currentPhase: prediction.currentPhase || "",
        currentDay,
        ovulationDay,
        cycleLengthUsed,
        cycleCount,
        phaseMessage,
        confidenceLevel: prediction.confidenceLevel,
        irregularityFlag: prediction.irregularityFlag,
        variation: prediction.variation,
      });

      setResult({
        nextPeriodDate: prediction.nextPeriodDate || "",
        ovulationDate: prediction.ovulationDate || "",
        fertileWindowStart: prediction.fertileWindowStart || "",
        fertileWindowEnd: prediction.fertileWindowEnd || "",
        isApproximatePrediction: Boolean(prediction.isApproximatePrediction),
        currentPhase: prediction.currentPhase || "",
        currentDay,
        ovulationDay,
        cycleLengthUsed,
        cycleCount,
        phaseMessage,
        confidenceLevel: prediction.confidenceLevel,
        irregularityFlag: prediction.irregularityFlag,
      });

      const updatedHistory = await getCycleHistory(token);
      setHistory(updatedHistory.entries || []);
    } catch (error) {
      setApiError(error.message || "Unable to save cycle data.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageFrame className="page-shell cycle-page-shell">
      <motion.section className="page-card tracker-card cycle-form-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="cycle-kicker" variants={staggerItem}>
          Predict and Plan
        </motion.p>

        <motion.h2 className="cycle-title" variants={staggerItem}>
          Cycle Tracker
        </motion.h2>

        <motion.p className="cycle-intro" variants={staggerItem}>
          Enter cycle data in the format that works best for you. Adaptive prediction stays the source of truth.
        </motion.p>

        <motion.p className="section-intro compact" variants={staggerItem}>
          Option 1: Last period date + cycle length. Option 2: Multiple past period dates. Option 3: Direct date marking in
          dashboard calendar.
        </motion.p>

        <motion.form onSubmit={handleCalculate} className="form-layout cycle-form" variants={staggerParent}>
          <motion.div className="form-group cycle-field" variants={staggerItem}>
            <label htmlFor="last-date">Last Period Date</label>
            <input
              id="last-date"
              type="date"
              value={lastDate}
              onChange={(event) => {
                setLastDate(event.target.value);
                setErrors((prev) => ({ ...prev, lastDate: "" }));
              }}
              className={errors.lastDate ? "input-error" : ""}
            />
            {errors.lastDate && <p className="field-error">{errors.lastDate}</p>}
          </motion.div>

          <motion.div className="form-group cycle-field" variants={staggerItem}>
            <label htmlFor="past-period-dates">Past Period Start Dates (optional)</label>
            <textarea
              id="past-period-dates"
              rows="3"
              value={pastPeriodDatesInput}
              onChange={(event) => {
                setPastPeriodDatesInput(event.target.value);
                setErrors((prev) => ({ ...prev, pastPeriodDates: "" }));
              }}
              className={errors.pastPeriodDates ? "input-error" : ""}
              placeholder="YYYY-MM-DD, YYYY-MM-DD, YYYY-MM-DD"
            />
            {errors.pastPeriodDates && <p className="field-error">{errors.pastPeriodDates}</p>}
          </motion.div>

          <motion.div className="form-group cycle-field" variants={staggerItem}>
            <label htmlFor="cycle-length">Cycle Length (days)</label>
            <input
              id="cycle-length"
              type="number"
              value={cycleLength}
              onChange={(event) => {
                setCycleLength(event.target.value);
                setErrors((prev) => ({ ...prev, cycleLength: "" }));
              }}
              placeholder="e.g. 28"
              min="1"
              className={errors.cycleLength ? "input-error" : ""}
            />
            {errors.cycleLength && <p className="field-error">{errors.cycleLength}</p>}
          </motion.div>

          {apiError && (
            <motion.p className="field-error" variants={staggerItem}>
              {apiError}
            </motion.p>
          )}

          <motion.button
            type="submit"
            className="btn-primary btn-block cycle-submit"
            variants={staggerItem}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save and Predict"}
          </motion.button>
        </motion.form>

        <motion.p className="link-row cycle-link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link>
        </motion.p>
      </motion.section>

      {result && (
        <motion.section
          className="page-card tracker-result-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="tracker-results-kicker">Cycle Prediction</p>
          <h3 className="tracker-results-heading">Your Results</h3>

          <div className="tracker-highlight-grid">
            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Next Period</p>
              <p className="tracker-highlight-value">{formatDisplayDate(result.nextPeriodDate)}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Ovulation</p>
              <p className="tracker-highlight-value">{formatDisplayDate(result.ovulationDate)}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Fertile Window</p>
              <p className="tracker-highlight-value">{formatDateRange(result.fertileWindowStart, result.fertileWindowEnd)}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Current Phase</p>
              <p className="tracker-highlight-value">{result.currentPhase || "--"}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Current Day</p>
              <p className="tracker-highlight-value">{result.currentDay || "--"}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Ovulation Day</p>
              <p className="tracker-highlight-value">{result.ovulationDay || "--"}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Confidence</p>
              <p className="tracker-highlight-value">{result.confidenceLevel || "--"}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Cycle Pattern</p>
              <p className="tracker-highlight-value">{result.irregularityFlag ? "Irregular" : "Regular"}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Input Mode</p>
              <p className="tracker-highlight-value">{inputMethod || "--"}</p>
            </article>

            <article className="tracker-highlight-item">
              <p className="tracker-highlight-label">Prediction Type</p>
              <p className="tracker-highlight-value">{result.isApproximatePrediction ? "Approximate" : "Adaptive"}</p>
            </article>
          </div>

          {result.phaseMessage && <p className="section-intro compact">{result.phaseMessage}</p>}
        </motion.section>
      )}

      {history.length > 0 && (
        <motion.section
          className="page-card tracker-result-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="tracker-results-kicker">Saved Entries</p>
          <h3 className="tracker-results-heading">Cycle History</h3>
          <div className="tracker-highlight-grid">
            {history.slice(0, 6).map((entry) => (
              <article key={entry.id} className="tracker-highlight-item">
                <p className="tracker-highlight-label">Entry #{entry.id}</p>
                <p className="tracker-highlight-value">{formatDisplayDate(entry.period_start_date)}</p>
              </article>
            ))}
          </div>
        </motion.section>
      )}
    </PageFrame>
  );
}


