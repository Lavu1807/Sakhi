import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { saveSymptomChatContext } from "./symptomContext";

const initialSymptoms = {
  cramps: false,
  headache: false,
  fatigue: false,
  bloating: false,
  moodSwings: false,
};

const SYMPTOM_GROUPS = [
  {
    title: "Physical Symptoms",
    items: [
      { key: "cramps", label: "Cramps" },
      { key: "headache", label: "Headache" },
      { key: "fatigue", label: "Fatigue" },
      { key: "bloating", label: "Bloating" },
    ],
  },
  {
    title: "Emotional Symptoms",
    items: [{ key: "moodSwings", label: "Mood Swings" }],
  },
];

const SYMPTOM_LABELS = {
  cramps: "Cramps",
  headache: "Headache",
  fatigue: "Fatigue",
  bloating: "Bloating",
  moodSwings: "Mood Swings",
};

const SUGGESTION_BY_SYMPTOM = {
  cramps: "Take extra rest and try gentle heat therapy for comfort.",
  fatigue: "Include iron-rich foods like spinach, lentils, or beans in your meals.",
  moodSwings: "Try short relaxation techniques like deep breathing or journaling.",
  bloating: "Stay hydrated through the day and reduce very salty snacks.",
};

const SAFETY_DISCLAIMER_TEXT = "This is not a medical diagnosis.";
const HIGH_RISK_CONSULT_TEXT = "Please consult a healthcare professional.";
const SYMPTOM_TREND_STORAGE_KEY = "sakhi_symptom_trend_entries";
const MAX_TREND_ENTRIES = 30;

function loadTrendEntries() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(SYMPTOM_TREND_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => ({
        timestamp: typeof entry?.timestamp === "string" ? entry.timestamp : "",
        painLevel: Number(entry?.painLevel),
        symptoms: Array.isArray(entry?.symptoms) ? entry.symptoms.filter(Boolean) : [],
      }))
      .filter((entry) => entry.timestamp && Number.isFinite(entry.painLevel) && entry.painLevel >= 1 && entry.painLevel <= 10)
      .slice(-MAX_TREND_ENTRIES);
  } catch {
    return [];
  }
}

function persistTrendEntries(entries) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(SYMPTOM_TREND_STORAGE_KEY, JSON.stringify(entries));
}

function formatTrendDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "recent";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildSymptomFrequencyData(trendEntries) {
  const counts = {
    cramps: 0,
    headache: 0,
    fatigue: 0,
    bloating: 0,
    moodSwings: 0,
  };

  for (const entry of trendEntries) {
    for (const symptom of entry.symptoms) {
      if (Object.prototype.hasOwnProperty.call(counts, symptom)) {
        counts[symptom] += 1;
      }
    }
  }

  const items = Object.entries(counts)
    .map(([key, count]) => ({
      key,
      label: SYMPTOM_LABELS[key],
      count,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const maxCount = items.length > 0 ? Math.max(...items.map((item) => item.count)) : 0;

  return {
    items,
    maxCount,
  };
}

function buildPainTrendData(trendEntries) {
  const recentEntries = trendEntries.slice(-10);
  if (recentEntries.length === 0) {
    return {
      points: "",
      markers: [],
      startLabel: "",
      endLabel: "",
      averagePain: null,
    };
  }

  const markers = recentEntries.map((entry, index) => {
    const pointCount = Math.max(recentEntries.length - 1, 1);
    const x = recentEntries.length === 1 ? 50 : (index / pointCount) * 100;
    const y = 100 - ((entry.painLevel - 1) / 9) * 100;

    return {
      x,
      y,
      painLevel: entry.painLevel,
      label: formatTrendDate(entry.timestamp),
    };
  });

  const points = markers.map((marker) => `${marker.x},${marker.y}`).join(" ");
  const averagePain = recentEntries.reduce((sum, entry) => sum + entry.painLevel, 0) / recentEntries.length;

  return {
    points,
    markers,
    startLabel: markers[0]?.label || "",
    endLabel: markers[markers.length - 1]?.label || "",
    averagePain,
  };
}

function resolveSeverity(painLevel) {
  if (painLevel <= 3) {
    return "mild";
  }

  if (painLevel <= 7) {
    return "moderate";
  }

  return "severe";
}

function resolveRisk({ painLevel, severity, selectedSymptoms }) {
  if (painLevel >= 9 || (selectedSymptoms.includes("headache") && selectedSymptoms.includes("fatigue"))) {
    return "high";
  }

  if (severity === "moderate" || selectedSymptoms.includes("moodSwings")) {
    return "medium";
  }

  return "low";
}

function toTitleCase(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildInsights({ selectedSymptoms, severity }) {
  const insights = [];

  if (selectedSymptoms.length === 0) {
    insights.push("No symptoms selected yet. Add symptoms to generate focused insights.");
    return insights;
  }

  if (selectedSymptoms.includes("cramps") && selectedSymptoms.includes("fatigue")) {
    insights.push("Cramps with fatigue can be common during menstruation for many people.");
  }

  if (selectedSymptoms.includes("moodSwings")) {
    insights.push("Mood changes can increase near cycle transitions and stress-heavy days.");
  }

  if (selectedSymptoms.includes("bloating")) {
    insights.push("Bloating often improves with hydration and lighter, balanced meals.");
  }

  if (selectedSymptoms.includes("headache")) {
    insights.push("Headache may be related to hydration, sleep quality, or hormonal fluctuation.");
  }

  if (severity === "severe") {
    insights.push("Your reported pain level is high and should be monitored closely.");
  }

  if (insights.length === 0) {
    insights.push("Your symptoms look manageable with routine self-care and regular tracking.");
  }

  return insights;
}

function buildSuggestions(selectedSymptoms) {
  const suggestions = selectedSymptoms
    .map((symptom) => SUGGESTION_BY_SYMPTOM[symptom])
    .filter(Boolean);

  if (suggestions.length === 0) {
    return ["Keep logging symptoms daily so guidance can stay personalized and practical."];
  }

  return Array.from(new Set(suggestions));
}

function toChatSymptomLabel(symptomKey) {
  if (symptomKey === "moodSwings") {
    return "mood swings";
  }

  return symptomKey;
}

export default function Symptoms() {
  const [symptoms, setSymptoms] = useState(initialSymptoms);
  const [painLevel, setPainLevel] = useState(4);
  const [result, setResult] = useState(null);
  const [trendEntries, setTrendEntries] = useState(() => loadTrendEntries());
  const symptomFrequencyData = useMemo(() => buildSymptomFrequencyData(trendEntries), [trendEntries]);
  const painTrendData = useMemo(() => buildPainTrendData(trendEntries), [trendEntries]);

  function handleCheckboxChange(event) {
    const { name, checked } = event.target;
    setSymptoms((prev) => ({ ...prev, [name]: checked }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const selectedSymptoms = Object.keys(symptoms).filter((key) => symptoms[key]);

    const severity = resolveSeverity(painLevel);
    const risk = resolveRisk({ painLevel, severity, selectedSymptoms });
    const insights = buildInsights({ selectedSymptoms, severity });
    const suggestions = buildSuggestions(selectedSymptoms);

    const warnings = [];
    if (risk === "high") {
      warnings.push(HIGH_RISK_CONSULT_TEXT);
    }

    if (severity === "severe") {
      warnings.push("Severe pain level reported. Prioritize rest and seek clinical advice if this persists.");
    }

    const selectedLabels = selectedSymptoms.map((key) => SYMPTOM_LABELS[key]);
    const chatSymptoms = selectedSymptoms.map((key) => toChatSymptomLabel(key));
    const analysis = {
      severity,
      risk,
      insights,
      suggestions,
      personalizedInsights: [],
    };

    saveSymptomChatContext({
      symptoms: chatSymptoms,
      symptomAnalysis: analysis,
      updatedAt: new Date().toISOString(),
    });

    setResult({
      selectedLabels,
      severity,
      risk,
      insights,
      suggestions,
      warnings,
    });

    setTrendEntries((previousEntries) => {
      const nextEntries = [
        ...previousEntries,
        {
          timestamp: new Date().toISOString(),
          painLevel,
          symptoms: selectedSymptoms,
        },
      ].slice(-MAX_TREND_ENTRIES);

      persistTrendEntries(nextEntries);
      return nextEntries;
    });
  }

  return (
    <PageFrame>
      <motion.section className="page-card symptoms-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={staggerItem}>
          Understand What You Feel
        </motion.p>

        <motion.h2 className="heading-with-icon" variants={staggerItem}>
          <span className="heading-icon" aria-hidden="true">
            🩺
          </span>
          Symptoms Checker
        </motion.h2>

        <motion.p className="section-intro symptoms-intro" variants={staggerItem}>
          Select what you are experiencing so we can organize gentle self-care guidance.
        </motion.p>

        <motion.form onSubmit={handleSubmit} className="form-layout" variants={staggerParent}>
          <motion.div className="symptom-groups" variants={staggerParent}>
            {SYMPTOM_GROUPS.map((group) => (
              <motion.section key={group.title} className="symptom-group-card" variants={staggerItem}>
                <h3 className="symptom-group-title">{group.title}</h3>
                <div className="checkbox-list symptom-checkbox-list">
                  {group.items.map((item) => {
                    const inputId = `symptom-${item.key}`;

                    return (
                      <label key={item.key} className="checkbox-item" htmlFor={inputId}>
                        <input
                          id={inputId}
                          type="checkbox"
                          name={item.key}
                          checked={symptoms[item.key]}
                          onChange={handleCheckboxChange}
                        />
                        {item.label}
                      </label>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </motion.div>

          <motion.div className="form-group symptom-pain-field" variants={staggerItem}>
            <label htmlFor="symptom-pain-level">Pain Level (1 to 10)</label>
            <div className="symptom-pain-row">
              <input
                id="symptom-pain-level"
                type="range"
                min="1"
                max="10"
                value={painLevel}
                onChange={(event) => setPainLevel(Number(event.target.value))}
                className="symptom-pain-slider"
              />
              <span className={`symptom-pain-value ${resolveSeverity(painLevel)}`}>{painLevel}</span>
            </div>
          </motion.div>

          <motion.button type="submit" className="btn-primary btn-block" variants={staggerItem}>
            Check Symptoms
          </motion.button>
        </motion.form>

        <motion.p className="disclaimer-text symptoms-disclaimer" variants={staggerItem}>
          {SAFETY_DISCLAIMER_TEXT}
        </motion.p>

        {result && (
          <motion.section
            className="result-card symptoms-result-box"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3>Selected Symptoms</h3>
            <div className="symptom-tags-row">
              {result.selectedLabels.length ? (
                result.selectedLabels.map((label) => (
                  <span key={label} className="symptom-tag">
                    {label}
                  </span>
                ))
              ) : (
                <p className="symptom-empty-state">No symptoms selected.</p>
              )}
            </div>

            <div className="symptom-analysis-overview">
              <section className="symptom-metric-card">
                <p className="symptom-metric-label">Severity</p>
                <span className={`symptom-severity-badge ${result.severity}`}>{toTitleCase(result.severity)}</span>
              </section>

              <section className="symptom-metric-card">
                <p className="symptom-metric-label">Risk Level</p>
                <span className={`symptom-risk-badge ${result.risk}`}>{toTitleCase(result.risk)}</span>
              </section>
            </div>

            {result.warnings.length > 0 ? (
              <section className={`symptom-warning-banner ${result.risk}`}>
                <h3 className="symptom-warning-title">Attention Needed</h3>
                <ul className="symptom-warning-list">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="symptom-result-grid">
              <section className="symptom-result-panel">
                <h3 className="sub-section-title">Insights</h3>
                <ul className="nutrition-list symptom-result-list">
                  {result.insights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="symptom-result-panel">
                <h3 className="sub-section-title">Suggestions</h3>
                <div className="symptom-suggestion-grid">
                  {result.suggestions.map((item) => (
                    <article key={item} className="symptom-suggestion-card">
                      <p className="symptom-suggestion-text">{item}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </motion.section>
        )}

        <motion.section
          className="result-card symptom-trend-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3>Symptom Trends</h3>
          <p className="symptom-trend-subtitle">Pattern summary from your recent symptom check-ins.</p>

          {trendEntries.length === 0 ? (
            <p className="symptom-trend-empty">No trend data yet. Submit symptoms to start tracking patterns.</p>
          ) : (
            <div className="symptom-trend-grid">
              <section className="symptom-trend-panel">
                <h3 className="sub-section-title">Symptom Frequency</h3>
                {symptomFrequencyData.items.length === 0 ? (
                  <p className="symptom-trend-empty">No recurring symptoms recorded yet.</p>
                ) : (
                  <div className="symptom-frequency-list">
                    {symptomFrequencyData.items.map((item) => {
                      const widthPercent =
                        symptomFrequencyData.maxCount > 0
                          ? Math.round((item.count / symptomFrequencyData.maxCount) * 100)
                          : 0;

                      return (
                        <div key={item.key} className="symptom-frequency-row">
                          <span className="symptom-frequency-label">{item.label}</span>
                          <div className="symptom-frequency-track" role="presentation">
                            <div className="symptom-frequency-fill" style={{ width: `${widthPercent}%` }} />
                          </div>
                          <span className="symptom-frequency-count">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="symptom-trend-panel">
                <h3 className="sub-section-title">Pain Level Trend</h3>
                <div className="symptom-pain-chart-wrap">
                  {painTrendData.markers.length > 0 ? (
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="symptom-pain-svg"
                      role="img"
                      aria-label="Pain level trend chart"
                    >
                      <line x1="0" y1="100" x2="100" y2="100" className="symptom-pain-gridline" />
                      <line x1="0" y1="50" x2="100" y2="50" className="symptom-pain-gridline" />
                      <line x1="0" y1="0" x2="100" y2="0" className="symptom-pain-gridline" />
                      <polyline fill="none" points={painTrendData.points} className="symptom-pain-line" />
                      {painTrendData.markers.map((marker, index) => (
                        <circle key={`${marker.label}-${index}`} cx={marker.x} cy={marker.y} r="2" className="symptom-pain-point" />
                      ))}
                    </svg>
                  ) : (
                    <p className="symptom-trend-empty">No pain trend data available yet.</p>
                  )}
                </div>

                {painTrendData.averagePain !== null ? (
                  <p className="symptom-trend-average">
                    Average pain level: <strong>{painTrendData.averagePain.toFixed(1)}</strong>
                  </p>
                ) : null}

                {painTrendData.startLabel && painTrendData.endLabel ? (
                  <div className="symptom-trend-axis">
                    <span>{painTrendData.startLabel}</span>
                    <span>{painTrendData.endLabel}</span>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </motion.section>

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


