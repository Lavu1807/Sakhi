import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
  const [duration, setDuration] = useState("");
  const [result, setResult] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const storedCycleData = readCycleData();

    setLastDate(storedCycleData.lastDate);
    setCycleLength(storedCycleData.cycleLength);
    setDuration(storedCycleData.duration);

    if (storedCycleData.nextPeriod && storedCycleData.ovulationDate) {
      setResult({
        nextPeriodDate: storedCycleData.nextPeriod,
        ovulationDate: storedCycleData.ovulationDate,
        currentPhase: storedCycleData.currentPhase,
      });
    }
  }, []);

  function handleCalculate(event) {
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

    const nextPeriodDate = addDays(lastPeriodDate, cycleLengthNumber);
    const ovulationDate = addDays(nextPeriodDate, -14);
    const currentPhase = getCurrentPhase(lastPeriodDate, cycleLengthNumber);
    const nextPeriodIso = nextPeriodDate.toISOString();
    const ovulationIso = ovulationDate.toISOString();

    saveCycleData({
      lastDate,
      cycleLength: cycleLengthNumber,
      duration,
      nextPeriod: nextPeriodIso,
      ovulationDate: ovulationIso,
      currentPhase,
    });

    setResult({
      nextPeriodDate: nextPeriodIso,
      ovulationDate: ovulationIso,
      currentPhase,
    });
  }

  return (
    <main className="page-shell">
      <section className="page-card tracker-card">
        <h2 className="heading-with-icon">
          <span className="heading-icon" aria-hidden="true">
            🌸
          </span>
          Cycle Tracker
        </h2>

        <form onSubmit={handleCalculate} className="form-layout">
          <div className="form-group">
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
          </div>

          <div className="form-group">
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
          </div>

          <div className="form-group">
            <label htmlFor="duration">Duration (optional, days)</label>
            <input
              id="duration"
              type="number"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="e.g. 5"
              min="1"
            />
          </div>

          <button type="submit" className="btn-primary btn-block">
            Calculate
          </button>
        </form>

        {result && (
          <section className="result-card">
            <h3>Results</h3>
            <p>Last Period Date: {lastDate || "-"}</p>
            <p>Cycle Length: {cycleLength || "-"} days</p>
            <p>Duration: {duration || "-"} days</p>
            <p>Next Period Date: {formatDisplayDate(result.nextPeriodDate)}</p>
            <p>Ovulation Date: {formatDisplayDate(result.ovulationDate)}</p>
            <p>Current Phase: {result.currentPhase}</p>
          </section>
        )}

        <p className="link-row">
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </section>
    </main>
  );
}
