import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import CycleCalendar from "../components/CycleCalendar";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";
import { getCycleHistory, getPrediction } from "../utils/api";
import { clearAuthSession, getAuthToken, getAuthUser } from "../utils/auth";
import { formatDisplayDate, formatOvulationWindow, readCycleData, saveCycleData } from "../utils/cycleUtils";

function parseDateOnly(value) {
  if (!value || typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function getLastCycleLength(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const latestCycleLength = Number(entries[0]?.cycle_length);
  if (Number.isFinite(latestCycleLength) && latestCycleLength > 0) {
    return latestCycleLength;
  }

  if (entries.length < 2) {
    return null;
  }

  const latestStart = parseDateOnly(entries[0]?.period_start_date);
  const previousStart = parseDateOnly(entries[1]?.period_start_date);

  if (!latestStart || !previousStart) {
    return null;
  }

  const days = Math.round((latestStart - previousStart) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

function formatDays(value, { allowZero = false } = {}) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  if (value < 0) {
    return "--";
  }

  if (!allowZero && value === 0) {
    return "--";
  }

  return `${Math.round(value)} days`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [cycleData, setCycleData] = useState(readCycleData());
  const [cycleHistory, setCycleHistory] = useState([]);
  const [apiError, setApiError] = useState("");
  const [displayName, setDisplayName] = useState("User");

  useEffect(() => {
    const token = getAuthToken();
    const storedCycleData = readCycleData();
    const authUser = getAuthUser();

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    if (authUser?.name) {
      setDisplayName(authUser.name);
    }

    setCycleData(storedCycleData);

    async function loadPrediction() {
      try {
        const defaultCycleLength = Number(storedCycleData.cycleLength);
        const [prediction, historyResponse] = await Promise.all([
          getPrediction(token, Number.isFinite(defaultCycleLength) ? defaultCycleLength : undefined),
          getCycleHistory(token),
        ]);

        const historyEntries = Array.isArray(historyResponse?.entries) ? historyResponse.entries : [];
        setCycleHistory(historyEntries);

        const predictionCycleCount = Number(prediction.cycleCount);
        const resolvedCycleCount = Number.isFinite(predictionCycleCount) ? predictionCycleCount : historyEntries.length;

        const nextCycleData = {
          ...storedCycleData,
          lastDate: prediction.latestPeriodDate || storedCycleData.lastDate,
          nextPeriod: prediction.nextPeriodDate || storedCycleData.nextPeriod,
          ovulationDate: prediction.ovulationDate || storedCycleData.ovulationDate,
          cycleLength: prediction.averageCycleLength ? String(prediction.averageCycleLength) : storedCycleData.cycleLength,
          currentPhase: prediction.currentPhase || storedCycleData.currentPhase,
          currentDay: Number.isFinite(Number(prediction.currentDay)) ? Number(prediction.currentDay) : storedCycleData.currentDay,
          ovulationDay: Number.isFinite(Number(prediction.ovulationDay))
            ? Number(prediction.ovulationDay)
            : storedCycleData.ovulationDay,
          cycleLengthUsed: Number.isFinite(Number(prediction.cycleLengthUsed))
            ? Number(prediction.cycleLengthUsed)
            : storedCycleData.cycleLengthUsed,
          cycleCount: Number.isFinite(resolvedCycleCount) ? resolvedCycleCount : storedCycleData.cycleCount,
          phaseMessage: prediction.phaseMessage || storedCycleData.phaseMessage,
          confidenceLevel: prediction.confidenceLevel || "",
          irregularityFlag: typeof prediction.irregularityFlag === "boolean" ? prediction.irregularityFlag : null,
          variation: Number.isFinite(Number(prediction.variation)) ? Number(prediction.variation) : storedCycleData.variation,
        };

        saveCycleData(nextCycleData);
        setCycleData(nextCycleData);
      } catch (error) {
        if (error.message === "Invalid or expired token.") {
          clearAuthSession();
          navigate("/", { replace: true });
          return;
        }

        setApiError(error.message || "Unable to load latest prediction.");
      }
    }

    loadPrediction();
  }, [navigate]);

  const summaryCards = useMemo(
    () => [
      {
        key: "phase",
        icon: "🌙",
        title: "Current Phase",
        value: cycleData.currentPhase || "No data yet",
      },
      {
        key: "next-period",
        icon: "🗓️",
        title: "Next Period",
        value: formatDisplayDate(cycleData.nextPeriod),
      },
      {
        key: "ovulation",
        icon: "🌸",
        title: "Ovulation",
        value: formatOvulationWindow(cycleData.ovulationDate),
      },
      {
        key: "confidence",
        icon: "📊",
        title: "Confidence",
        value: cycleData.confidenceLevel || "Low",
      },
      {
        key: "current-day",
        icon: "⏱️",
        title: "Day In Cycle",
        value: cycleData.currentDay || "--",
      },
      {
        key: "irregularity",
        icon: "🧭",
        title: "Cycle Pattern",
        value:
          cycleData.irregularityFlag === null
            ? "Need more data"
            : cycleData.irregularityFlag
              ? "Irregular (>5 days variation)"
              : "Regular",
      },
    ],
    [cycleData],
  );

  const smartInsights = useMemo(() => {
    const variation = Number(cycleData.variation);
    const cycleCount = Number(cycleData.cycleCount);
    const normalizedPhase = String(cycleData.currentPhase || "").toLowerCase();

    let regularityInsight = "Add more cycle entries to evaluate your cycle regularity.";

    if (Number.isFinite(variation)) {
      if (variation <= 3) {
        regularityInsight = "Your cycle appears regular and predictable.";
      } else if (variation <= 6) {
        regularityInsight = "Your cycle shows some variation.";
      } else {
        regularityInsight = "Your cycle appears irregular. Consider consulting a doctor.";
      }
    }

    let phaseInsight = "Log more cycle data to personalize your phase insight.";

    if (normalizedPhase.includes("menstrual")) {
      phaseInsight = "Your body is in rest phase. Focus on recovery.";
    } else if (normalizedPhase.includes("follicular")) {
      phaseInsight = "Energy levels may increase. Good time to start new activities.";
    } else if (normalizedPhase.includes("ovulation")) {
      phaseInsight = "You may feel energetic and confident today.";
    } else if (normalizedPhase.includes("luteal")) {
      phaseInsight = "You may experience mood changes. Prioritize self-care.";
    }

    let confidenceInsight = "Prediction accuracy is low (limited data)";

    if (Number.isFinite(cycleCount)) {
      if (cycleCount < 3) {
        confidenceInsight = "Prediction accuracy is low (limited data)";
      } else if (cycleCount <= 5) {
        confidenceInsight = "Prediction accuracy is improving";
      } else {
        confidenceInsight = "Prediction accuracy is high";
      }
    }

    return [regularityInsight, phaseInsight, confidenceInsight];
  }, [cycleData]);

  const showImprovingPredictionMessage = useMemo(() => {
    const cycleCount = Number(cycleData.cycleCount);
    return Number.isFinite(cycleCount) && cycleCount >= 3;
  }, [cycleData.cycleCount]);

  const statisticsCards = useMemo(() => {
    const averageCycleLength = Number(cycleData.cycleLength);
    const totalCyclesRecorded = Number(cycleData.cycleCount);
    const variation = Number(cycleData.variation);
    const lastCycleLength = getLastCycleLength(cycleHistory);

    return [
      {
        key: "average-length",
        label: "Average Cycle Length",
        value: formatDays(averageCycleLength),
      },
      {
        key: "total-cycles",
        label: "Total Cycles Recorded",
        value: Number.isFinite(totalCyclesRecorded) ? String(totalCyclesRecorded) : "--",
      },
      {
        key: "last-cycle-length",
        label: "Last Cycle Length",
        value: formatDays(lastCycleLength),
      },
      {
        key: "variation",
        label: "Variation in Cycle Length",
        value: formatDays(variation, { allowZero: true }),
      },
    ];
  }, [cycleData, cycleHistory]);

  function handleLogout() {
    clearAuthSession();
    navigate("/", { replace: true });
  }

  return (
    <PageFrame>
      <section className="page-card dashboard-card dashboard-page">
        <motion.div
          className="dashboard-greeting"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="dashboard-greeting-line">Hello, {displayName} 💜</p>
          <h2>Welcome back to SAKHI</h2>
          <p className="section-intro dashboard-intro">Your cycle essentials, neatly organized for today.</p>
          {apiError && <p className="field-error">{apiError}</p>}
        </motion.div>

        <motion.div className="dashboard-summary-grid" variants={staggerParent} initial="hidden" animate="show">
          {summaryCards.map((card) => (
            <motion.article key={card.key} className="dashboard-summary-card" variants={staggerItem}>
              <span className="summary-icon" aria-hidden="true">
                {card.icon}
              </span>
              <p className="summary-label">{card.title}</p>
              <h3 className="summary-value">{card.value}</h3>
            </motion.article>
          ))}
        </motion.div>

        {showImprovingPredictionMessage && (
          <motion.p
            className="dashboard-improving-message"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            Your predictions are improving as more data is recorded.
          </motion.p>
        )}

        <motion.section
          className="dashboard-stats-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <p className="tracker-results-kicker">Cycle Statistics</p>
          <h3 className="tracker-results-heading">Your Personalized Summary</h3>
          <div className="dashboard-stats-grid">
            {statisticsCards.map((stat) => (
              <article key={stat.key} className="dashboard-stat-item">
                <p className="dashboard-stat-label">{stat.label}</p>
                <p className="dashboard-stat-value">{stat.value}</p>
              </article>
            ))}
          </div>
        </motion.section>

        <motion.div
          className="dashboard-calendar-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          <CycleCalendar lastPeriodDate={cycleData.lastDate} cycleLength={cycleData.cycleLength} />
        </motion.div>

        <motion.section
          className="dashboard-insights-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
        >
          <p className="tracker-results-kicker">Smart Insights</p>
          <h3 className="tracker-results-heading">Personalized Guidance</h3>
          <ul className="dashboard-insights-list">
            {smartInsights.map((insight, index) => (
              <li key={`${insight}-${index}`} className="dashboard-insights-item">
                {insight}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.div
          className="dashboard-actions"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
        >
          <button type="button" className="btn-primary" onClick={() => navigate("/cycle")}>
            Track Cycle
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate("/nutrition")}>
            Nutrition
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate("/chatbot")}>
            Chat Support
          </button>
          <button type="button" className="btn-primary" onClick={handleLogout}>
            Logout
          </button>
        </motion.div>

        <p className="link-row dashboard-link-row">
          <Link to="/cycle">Update cycle details</Link>
        </p>
      </section>
    </PageFrame>
  );
}


