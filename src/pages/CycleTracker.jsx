import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";
import { addCycleEntry, getCycleHistory, getPrediction } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import {
  addDays,
  formatDisplayDate,
  getCurrentPhase,
  parseInputDate,
  readCycleData,
  saveCycleData,
} from "../utils/cycleUtils";

export default function CycleTracker() {
  const [lastDate, setLastDate] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
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
    const cycleLengthNumber = Number(cycleLength.trim());

    if (!lastDate) {
      validationErrors.lastDate = "Please select your last period date.";
    }

    if (!cycleLength || Number.isNaN(cycleLengthNumber) || cycleLengthNumber <= 0) {
      validationErrors.cycleLength = "Cycle length must be a positive number.";
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const lastPeriodDate = parseInputDate(lastDate);
    if (!lastPeriodDate) {
      setErrors({ lastDate: "Please select a valid date." });
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
      await addCycleEntry(
        {
          period_start_date: lastDate,
        },
        token,
      );

      const prediction = await getPrediction(token, cycleLengthNumber);
      const adaptiveCycleLength = Number(prediction.averageCycleLength || cycleLengthNumber);
      const nextPeriodDate = prediction.nextPeriodDate
        ? parseInputDate(prediction.nextPeriodDate)
        : addDays(lastPeriodDate, adaptiveCycleLength);
      const ovulationDate = prediction.ovulationDate ? parseInputDate(prediction.ovulationDate) : addDays(nextPeriodDate, -14);
      const currentPhase = prediction.currentPhase || getCurrentPhase(lastPeriodDate, adaptiveCycleLength);
      const currentDay = Number.isFinite(Number(prediction.currentDay)) ? Number(prediction.currentDay) : "";
      const ovulationDay = Number.isFinite(Number(prediction.ovulationDay)) ? Number(prediction.ovulationDay) : "";
      const cycleLengthUsed = Number.isFinite(Number(prediction.cycleLengthUsed))
        ? Number(prediction.cycleLengthUsed)
        : adaptiveCycleLength;
      const cycleCount = Number.isFinite(Number(prediction.cycleCount)) ? Number(prediction.cycleCount) : "";
      const phaseMessage = typeof prediction.phaseMessage === "string" ? prediction.phaseMessage : "";
      const nextPeriodIso = nextPeriodDate.toISOString();
      const ovulationIso = ovulationDate.toISOString();

      saveCycleData({
        lastDate,
        cycleLength: adaptiveCycleLength,
        nextPeriod: nextPeriodIso,
        ovulationDate: ovulationIso,
        currentPhase,
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
        nextPeriodDate: nextPeriodIso,
        ovulationDate: ovulationIso,
        currentPhase,
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
          Add your latest period date and average cycle length to calculate upcoming milestones.
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


