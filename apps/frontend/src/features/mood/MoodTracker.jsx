import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Link, useSearchParams } from "react-router-dom";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { addMoodEntry, getMoodEntries } from "../../shared/utils/api";
import { getAuthToken } from "../../shared/utils/auth";
import { readCycleData } from "../cycle/cycleUtils";
import { saveMoodChatContext } from "./moodContext";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const MOOD_OPTIONS = [
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "sad", label: "Sad", emoji: "😢" },
  { value: "irritated", label: "Irritated", emoji: "😠" },
  { value: "anxious", label: "Anxious", emoji: "😟" },
  { value: "calm", label: "Calm", emoji: "😌" },
];

const PHASE_OPTIONS = ["Menstrual", "Follicular", "Ovulation", "Luteal"];
const PHASE_COLORS = {
  Menstrual: "#f2a4c4",
  Follicular: "#8fb4ea",
  Ovulation: "#9b80de",
  Luteal: "#f2be73",
};

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizePhase(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

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

  return "Menstrual";
}

function getMoodMeta(mood) {
  return MOOD_OPTIONS.find((item) => item.value === mood) || { label: mood, emoji: "🙂" };
}

function getEntryTime(entry) {
  const dateValue = new Date(entry?.date || "").getTime();
  const createdValue = new Date(entry?.createdAt || "").getTime();
  return (Number.isFinite(dateValue) ? dateValue : 0) + (Number.isFinite(createdValue) ? createdValue / 1e9 : 0);
}

function sortEntriesLatest(entries) {
  return [...entries].sort((a, b) => getEntryTime(b) - getEntryTime(a));
}

function sortEntriesChronological(entries) {
  return [...entries].sort((a, b) => getEntryTime(a) - getEntryTime(b));
}

function formatTrendDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString || "";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildMoodTrendData(entries) {
  const timeline = sortEntriesChronological(entries).slice(-20);
  if (timeline.length === 0) {
    return null;
  }

  return {
    labels: timeline.map((entry) => formatTrendDate(entry.date)),
    datasets: [
      {
        label: "Mood intensity",
        data: timeline.map((entry) => Number(entry.intensity) || 0),
        borderColor: "#8d79c7",
        backgroundColor: "rgba(141, 121, 199, 0.18)",
        pointBackgroundColor: timeline.map((entry) => PHASE_COLORS[entry.phase] || "#8d79c7"),
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        tension: 0.33,
        fill: true,
      },
    ],
  };
}

const moodTrendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 1,
      max: 5,
      ticks: { stepSize: 1 },
      title: {
        display: true,
        text: "Mood intensity",
      },
    },
    x: {
      title: {
        display: true,
        text: "Date",
      },
    },
  },
  plugins: {
    legend: {
      display: true,
      labels: {
        boxWidth: 12,
      },
    },
    tooltip: {
      callbacks: {
        label(context) {
          const value = context.raw;
          return `Intensity: ${value}/5`;
        },
      },
    },
  },
};

function buildInitialForm() {
  const cycleData = readCycleData();
  const initialCycleDay = Number(cycleData?.currentDay);

  return {
    date: getTodayDateString(),
    mood: "",
    intensity: 3,
    note: "",
    cycleDay: Number.isInteger(initialCycleDay) && initialCycleDay > 0 ? initialCycleDay : 1,
    phase: normalizePhase(cycleData?.currentPhase),
  };
}

export default function MoodTracker() {
  const [searchParams] = useSearchParams();
  const [formState, setFormState] = useState(() => buildInitialForm());
  const [entries, setEntries] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ type: "", text: "" });

  const selectedMoodMeta = useMemo(() => getMoodMeta(formState.mood), [formState.mood]);
  const sortedMoodEntries = useMemo(() => sortEntriesLatest(entries), [entries]);
  const moodTrendData = useMemo(() => buildMoodTrendData(entries), [entries]);

  useEffect(() => {
    const requestedDate = String(searchParams.get("date") || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return;
    }

    setFormState((previous) => ({
      ...previous,
      date: requestedDate,
    }));
  }, [searchParams]);

  useEffect(() => {
    async function loadHistory() {
      setIsLoadingHistory(true);
      setStatusMessage({ type: "", text: "" });

      try {
        const response = await getMoodEntries(getAuthToken(), { limit: 20 });
        const historyEntries = Array.isArray(response?.entries) ? response.entries : [];
        setEntries(historyEntries);
        setAnalysis(response?.analysis || null);

        const latestEntry = sortEntriesLatest(historyEntries)[0];
        if (latestEntry) {
          saveMoodChatContext({
            latestMood: latestEntry.mood,
            latestMoodIntensity: latestEntry.intensity,
            latestMoodDate: latestEntry.date,
            latestMoodPhase: latestEntry.phase,
            latestMoodNote: latestEntry.note || "",
          });
        }
      } catch (error) {
        setStatusMessage({
          type: "error",
          text: error.message || "Unable to load mood history.",
        });
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, []);

  function updateFormField(field, value) {
    setFormState((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formState.mood) {
      setStatusMessage({
        type: "error",
        text: "Please select a mood.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({ type: "", text: "" });

    try {
      const payload = {
        date: formState.date,
        mood: formState.mood,
        intensity: Number(formState.intensity),
        note: formState.note.trim() || undefined,
        cycleDay: Number(formState.cycleDay),
        phase: formState.phase,
      };

      const response = await addMoodEntry(payload, getAuthToken());
      const savedEntry = response?.entry;
      setAnalysis(response?.analysis || null);

      if (savedEntry) {
        setEntries((previous) => [savedEntry, ...previous.filter((item) => item.id !== savedEntry.id)]);
        saveMoodChatContext({
          latestMood: savedEntry.mood,
          latestMoodIntensity: savedEntry.intensity,
          latestMoodDate: savedEntry.date,
          latestMoodPhase: savedEntry.phase,
          latestMoodNote: savedEntry.note || "",
        });
      }

      setStatusMessage({
        type: "success",
        text: "Mood logged successfully.",
      });

      setFormState((previous) => ({
        ...previous,
        mood: "",
        note: "",
      }));
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error.message || "Failed to log mood.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageFrame>
      <motion.section className="page-card mood-page-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={staggerItem}>
          Emotional Check-In
        </motion.p>

        <motion.h2 className="heading-with-icon" variants={staggerItem}>
          <span className="heading-icon" aria-hidden="true">
            🧠
          </span>
          Mood Tracker
        </motion.h2>

        <motion.p className="section-intro" variants={staggerItem}>
          Capture how you feel today with a quick emoji check-in.
        </motion.p>

        <motion.form className="form-layout mood-form-layout" variants={staggerParent} onSubmit={handleSubmit}>
          <motion.div className="form-group" variants={staggerItem}>
            <label>How are you feeling today?</label>
            <div className="mood-emoji-grid" role="radiogroup" aria-label="Mood selection">
              {MOOD_OPTIONS.map((option) => {
                const isSelected = formState.mood === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`mood-emoji-btn${isSelected ? " selected" : ""}`}
                    onClick={() => updateFormField("mood", option.value)}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={option.label}
                  >
                    <span className="mood-emoji" aria-hidden="true">
                      {option.emoji}
                    </span>
                    <span className="mood-emoji-label">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="mood-intensity-grid" variants={staggerItem}>
            <div className="form-group">
              <label htmlFor="mood-intensity-slider">Intensity (1-5)</label>
              <div className="mood-intensity-row">
                <input
                  id="mood-intensity-slider"
                  type="range"
                  min="1"
                  max="5"
                  value={formState.intensity}
                  onChange={(event) => updateFormField("intensity", Number(event.target.value))}
                />
                <span className="mood-intensity-value">{formState.intensity}</span>
              </div>
            </div>

            <div className="form-group mood-current-selection">
              <label>Selected mood</label>
              <p>
                {selectedMoodMeta.emoji} {selectedMoodMeta.label}
              </p>
            </div>
          </motion.div>

          <motion.div className="mood-meta-grid" variants={staggerItem}>
            <div className="form-group">
              <label htmlFor="mood-date">Date</label>
              <input
                id="mood-date"
                type="date"
                value={formState.date}
                onChange={(event) => updateFormField("date", event.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="mood-cycle-day">Cycle Day</label>
              <input
                id="mood-cycle-day"
                type="number"
                min="1"
                max="60"
                value={formState.cycleDay}
                onChange={(event) => updateFormField("cycleDay", Number(event.target.value))}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="mood-phase">Phase</label>
              <select
                id="mood-phase"
                value={formState.phase}
                onChange={(event) => updateFormField("phase", event.target.value)}
                required
              >
                {PHASE_OPTIONS.map((phase) => (
                  <option key={phase} value={phase}>
                    {phase}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>

          <motion.div className="form-group" variants={staggerItem}>
            <label htmlFor="mood-note">Optional note</label>
            <textarea
              id="mood-note"
              rows="3"
              maxLength={500}
              value={formState.note}
              onChange={(event) => updateFormField("note", event.target.value)}
              placeholder="Write a short note about your day..."
            />
          </motion.div>

          {statusMessage.text ? (
            <motion.p className={statusMessage.type === "error" ? "field-error" : "mood-success"} variants={staggerItem}>
              {statusMessage.text}
            </motion.p>
          ) : null}

          <motion.button type="submit" className="btn-primary" variants={staggerItem} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Log Mood"}
          </motion.button>
        </motion.form>

        <motion.section className="mood-trend-card" variants={staggerItem}>
          <h3 className="tracker-results-heading">Mood Trend</h3>
          <p className="mood-analysis-line">Track intensity over time (X-axis: date, Y-axis: intensity).</p>

          {moodTrendData ? (
            <div className="mood-trend-chart-wrap">
              <Line data={moodTrendData} options={moodTrendOptions} />
            </div>
          ) : (
            <p className="myths-status">Add a few mood entries to see your trend chart.</p>
          )}

          <div className="mood-phase-legend" aria-label="Phase markers">
            {PHASE_OPTIONS.map((phase) => (
              <span key={phase} className="mood-phase-legend-item">
                <span className="mood-phase-dot" style={{ backgroundColor: PHASE_COLORS[phase] }} aria-hidden="true" />
                {phase}
              </span>
            ))}
          </div>
        </motion.section>

        <motion.section className="mood-history-section" variants={staggerItem}>
          <h3 className="tracker-results-heading">Recent Mood Entries</h3>

          {isLoadingHistory ? <p className="myths-status">Loading mood history...</p> : null}

          {!isLoadingHistory && sortedMoodEntries.length === 0 ? (
            <p className="myths-status">No mood entries yet. Start with your first check-in.</p>
          ) : null}

          {!isLoadingHistory && sortedMoodEntries.length > 0 ? (
            <div className="mood-history-list">
              {sortedMoodEntries.map((entry) => {
                const moodMeta = getMoodMeta(entry.mood);

                return (
                  <article key={entry.id} className="mood-history-item">
                    <div className="mood-history-top-row">
                      <p className="mood-history-heading">
                        <span aria-hidden="true">{moodMeta.emoji}</span> {moodMeta.label}
                      </p>
                      <p className="mood-history-date">{entry.date}</p>
                    </div>
                    <p className="mood-history-note">{entry.note || "No note added."}</p>
                  </article>
                );
              })}
            </div>
          ) : null}
        </motion.section>

        {analysis ? (
          <motion.section className="mood-analysis-card" variants={staggerItem}>
            <h3 className="tracker-results-heading">Mood Insights</h3>
            {sortedMoodEntries[0] ? (
              <div className="mood-current-highlight">
                <p className="mood-current-kicker">Current mood</p>
                <p className="mood-current-text">
                  <span aria-hidden="true">{getMoodMeta(sortedMoodEntries[0].mood).emoji}</span>{" "}
                  {getMoodMeta(sortedMoodEntries[0].mood).label} • Intensity {sortedMoodEntries[0].intensity}/5
                </p>
              </div>
            ) : null}

            <p className="mood-analysis-line">
              Dominant mood: <strong>{getMoodMeta(analysis.dominantMood).label}</strong>
            </p>

            <div className="mood-frequency-grid">
              {Object.entries(analysis.moodFrequency || {}).map(([mood, count]) => (
                <article key={mood} className="mood-frequency-item">
                  <p className="mood-frequency-label">
                    <span aria-hidden="true">{getMoodMeta(mood).emoji}</span> {getMoodMeta(mood).label}
                  </p>
                  <p className="mood-frequency-count">{count}</p>
                </article>
              ))}
            </div>

            {Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0 ? (
              <div className="mood-insights-block mood-suggestions-block">
                <p className="mood-insights-kicker">Actionable suggestions</p>
                <ul>
                  {analysis.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(analysis.alerts) && analysis.alerts.length > 0 ? (
              <div className="mood-alert-block" role="alert" aria-live="polite">
                {analysis.alerts.map((alert) => (
                  <p key={alert}>{alert}</p>
                ))}
              </div>
            ) : null}

            {Array.isArray(analysis.phaseInsights) && analysis.phaseInsights.length > 0 ? (
              <div className="mood-insights-block">
                <p className="mood-insights-kicker">Phase patterns</p>
                <ul>
                  {analysis.phaseInsights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(analysis.insights) && analysis.insights.length > 0 ? (
              <div className="mood-insights-block">
                <p className="mood-insights-kicker">Personalized insights</p>
                <ul>
                  {analysis.insights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </motion.section>
        ) : null}

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}
