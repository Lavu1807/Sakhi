import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import CycleCalendar from "../cycle/CycleCalendar";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { getCycleHistory, getCycleStatus, getPrediction, getRandomMyth, markPeriodEnd } from "../../shared/utils/api";
import { clearAllUserData, getAuthToken, getAuthUser } from "../../shared/utils/auth";
import { formatDateRange, formatDisplayDate, readCycleData, saveCycleData } from "../cycle/cycleUtils";

const MYTH_OF_DAY_STORAGE_KEY = "sakhi_myth_of_the_day";
const PERIOD_PROMPT_LAST_DATE_STORAGE_KEY = "sakhi_period_prompt_last_answer_date";

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readCachedMythOfDay(dateKey) {
  try {
    const raw = localStorage.getItem(MYTH_OF_DAY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (parsed?.dateKey !== dateKey || !parsed?.myth || !Number.isFinite(Number(parsed.myth.id))) {
      return null;
    }

    return parsed.myth;
  } catch {
    return null;
  }
}

function cacheMythOfDay(dateKey, myth) {
  try {
    localStorage.setItem(
      MYTH_OF_DAY_STORAGE_KEY,
      JSON.stringify({
        dateKey,
        myth,
      }),
    );
  } catch {
    // Ignore local storage failures to keep dashboard rendering resilient.
  }
}

function readLastPeriodPromptDate() {
  try {
    const raw = localStorage.getItem(PERIOD_PROMPT_LAST_DATE_STORAGE_KEY);
    if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return "";
    }

    return raw;
  } catch {
    return "";
  }
}

function saveLastPeriodPromptDate(dateKey) {
  try {
    localStorage.setItem(PERIOD_PROMPT_LAST_DATE_STORAGE_KEY, dateKey);
  } catch {
    // Ignore local storage failures to keep dashboard rendering resilient.
  }
}

function formatSourceLabel(source) {
  const normalizedSource = String(source || "").trim();
  return normalizedSource ? `Source: ${normalizedSource}` : "Source: Research article";
}

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

function calculateDaysUntil(dateValue) {
  if (!dateValue) {
    return null;
  }

  const target = parseDateOnly(String(dateValue).slice(0, 10));
  if (!target) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function formatCountdown(label, daysUntil) {
  if (!Number.isFinite(daysUntil)) {
    return `${label} date unavailable`;
  }

  if (daysUntil < 0) {
    return `${label} date passed`;
  }

  if (daysUntil === 0) {
    return `${label} is today`;
  }

  if (daysUntil === 1) {
    return `${label} in 1 day`;
  }

  return `${label} in ${daysUntil} days`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [cycleData, setCycleData] = useState(readCycleData());
  const [cycleHistory, setCycleHistory] = useState([]);
  const [calendarPrediction, setCalendarPrediction] = useState({
    phaseCalendar: [],
  });
  const [apiError, setApiError] = useState("");
  const [displayName, setDisplayName] = useState("User");
  const [mythOfDay, setMythOfDay] = useState(null);
  const [mythOfDayError, setMythOfDayError] = useState("");
  const [cycleStatus, setCycleStatus] = useState({
    periodStartDate: null,
    periodEndDate: null,
    isPeriodOngoing: false,
  });
  const [showPeriodEndPrompt, setShowPeriodEndPrompt] = useState(false);
  const [periodPromptError, setPeriodPromptError] = useState("");
  const [isResolvingPeriodPrompt, setIsResolvingPeriodPrompt] = useState(false);
  const [lastPromptDate, setLastPromptDate] = useState(() => readLastPeriodPromptDate());

  const refreshPrediction = useCallback(
    async (range = {}) => {
      const token = getAuthToken();
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      const storedCycleData = readCycleData();

      try {
        const defaultCycleLength = Number(storedCycleData.cycleLength);
        const [prediction, historyResponse] = await Promise.all([
          getPrediction(token, {
            defaultCycleLength: Number.isFinite(defaultCycleLength) ? defaultCycleLength : undefined,
            from: range.from,
            to: range.to,
          }),
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
          fertileWindowStart: prediction.fertileWindowStart || storedCycleData.fertileWindowStart,
          fertileWindowEnd: prediction.fertileWindowEnd || storedCycleData.fertileWindowEnd,
          isApproximatePrediction: Boolean(prediction.isApproximatePrediction),
          predictionMode: typeof prediction.predictionMode === "string" ? prediction.predictionMode : "",
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

        setCalendarPrediction({
          nextPeriodDate: prediction.nextPeriodDate || "",
          ovulationDate: prediction.ovulationDate || "",
          fertileWindowStart: prediction.fertileWindowStart || "",
          fertileWindowEnd: prediction.fertileWindowEnd || "",
          isApproximatePrediction: Boolean(prediction.isApproximatePrediction),
          phaseCalendar: Array.isArray(prediction.phaseCalendar) ? prediction.phaseCalendar : [],
        });

        saveCycleData(nextCycleData);
        setCycleData(nextCycleData);
        setApiError("");
      } catch (error) {
        if (error.message === "Invalid or expired token.") {
          clearAllUserData();
          navigate("/", { replace: true });
          return;
        }

        setApiError(error.message || "Unable to load latest prediction.");
      }
    },
    [navigate],
  );

  const refreshCycleStatus = useCallback(
    async ({ allowPrompt = true } = {}) => {
      const token = getAuthToken();
      if (!token) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const response = await getCycleStatus(token);
        const nextStatus = {
          periodStartDate: response?.status?.periodStartDate || null,
          periodEndDate: response?.status?.periodEndDate || null,
          isPeriodOngoing: Boolean(response?.status?.isPeriodOngoing),
        };
        const shouldPrompt = Boolean(
          response?.shouldPrompt && nextStatus.isPeriodOngoing && !nextStatus.periodEndDate,
        );
        const answeredToday = lastPromptDate === getDateKey();

        setCycleStatus(nextStatus);

        if (allowPrompt) {
          setShowPeriodEndPrompt(shouldPrompt && !answeredToday);
        }

        if (!shouldPrompt) {
          setShowPeriodEndPrompt(false);
        }

        setPeriodPromptError("");
      } catch (error) {
        if (error.message === "Invalid or expired token.") {
          clearAllUserData();
          navigate("/", { replace: true });
          return;
        }

        setCycleStatus({
          periodStartDate: null,
          periodEndDate: null,
          isPeriodOngoing: false,
        });
        setShowPeriodEndPrompt(false);
      }
    },
    [lastPromptDate, navigate],
  );

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

    async function loadMythOfDay() {
      const dateKey = getDateKey();
      const cachedMyth = readCachedMythOfDay(dateKey);

      if (cachedMyth) {
        setMythOfDay(cachedMyth);
        return;
      }

      try {
        const response = await getRandomMyth();
        const myth = response?.myth;

        if (!myth || !Number.isFinite(Number(myth.id))) {
          throw new Error("Invalid myth payload.");
        }

        setMythOfDay(myth);
        setMythOfDayError("");
        cacheMythOfDay(dateKey, myth);
      } catch (error) {
        setMythOfDay(null);
        setMythOfDayError(error.message || "Unable to load Myth of the Day.");
      }
    }

    refreshPrediction();
    refreshCycleStatus();
    loadMythOfDay();
  }, [navigate, refreshPrediction, refreshCycleStatus]);

  const handleCalendarPredictionRequest = useCallback(
    (range) => {
      refreshPrediction(range || {});
    },
    [refreshPrediction],
  );

  const handleCycleLogged = useCallback(
    async (range) => {
      await Promise.all([
        refreshPrediction(range || {}),
        refreshCycleStatus({ allowPrompt: false }),
      ]);
    },
    [refreshPrediction, refreshCycleStatus],
  );

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
        title: "Ovulation Day",
        value: formatDisplayDate(cycleData.ovulationDate),
      },
      {
        key: "fertile-window",
        icon: "🌱",
        title: "Fertile Window",
        value: formatDateRange(cycleData.fertileWindowStart, cycleData.fertileWindowEnd),
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

  const countdownMessages = useMemo(() => {
    const daysUntilNextPeriod = calculateDaysUntil(cycleData.nextPeriod);
    const daysUntilOvulation = calculateDaysUntil(cycleData.ovulationDate);

    return {
      nextPeriodText: formatCountdown("Next period", daysUntilNextPeriod),
      ovulationText: formatCountdown("Ovulation", daysUntilOvulation),
    };
  }, [cycleData.nextPeriod, cycleData.ovulationDate]);

  function markPeriodPromptAnsweredToday() {
    const todayDateKey = getDateKey();
    setLastPromptDate(todayDateKey);
    saveLastPeriodPromptDate(todayDateKey);
  }

  async function handleConfirmPeriodEnded() {
    const token = getAuthToken();
    if (!token) {
      clearAllUserData();
      navigate("/", { replace: true });
      return;
    }

    setIsResolvingPeriodPrompt(true);
    setPeriodPromptError("");

    try {
      await markPeriodEnd(
        {
          period_start_date: cycleStatus.periodStartDate || undefined,
          period_end_date: getDateKey(),
        },
        token,
      );

      setShowPeriodEndPrompt(false);
      markPeriodPromptAnsweredToday();

      await Promise.all([refreshPrediction(), refreshCycleStatus({ allowPrompt: false })]);
    } catch (error) {
      if (error.message === "Invalid or expired token.") {
        clearAllUserData();
        navigate("/", { replace: true });
        return;
      }

      setPeriodPromptError(error.message || "Unable to update period status.");
    } finally {
      setIsResolvingPeriodPrompt(false);
    }
  }

  function handleDismissPeriodPrompt() {
    setShowPeriodEndPrompt(false);
    setPeriodPromptError("");
    markPeriodPromptAnsweredToday();
  }

  return (
    <PageFrame>
      <section className="page-card dashboard-card dashboard-page">
        {showPeriodEndPrompt && (
          <div
            className="dashboard-period-prompt-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Period status check"
          >
            <div className="dashboard-period-prompt-card">
              <p className="dashboard-period-prompt-kicker">Cycle Check-In</p>
              <h3>Has your period ended?</h3>
              <p className="dashboard-period-prompt-copy">
                Your period that started on {formatDisplayDate(cycleStatus.periodStartDate)} is still marked as ongoing.
              </p>
              {periodPromptError ? <p className="field-error">{periodPromptError}</p> : null}
              <div className="dashboard-period-prompt-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleConfirmPeriodEnded}
                  disabled={isResolvingPeriodPrompt}
                >
                  {isResolvingPeriodPrompt ? "Updating..." : "Yes, mark it ended"}
                </button>
                <button
                  type="button"
                  className="calendar-day-ghost-btn"
                  onClick={handleDismissPeriodPrompt}
                  disabled={isResolvingPeriodPrompt}
                >
                  No, still ongoing
                </button>
              </div>
            </div>
          </div>
        )}

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

        <motion.section
          className="dashboard-myth-day-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
        >
          <p className="tracker-results-kicker">Myth of the Day</p>
          <h3 className="tracker-results-heading">Daily Learning Spark</h3>

          {!mythOfDay && !mythOfDayError && <p className="dashboard-myth-day-loading">Loading daily myth...</p>}

          {mythOfDayError && <p className="dashboard-myth-day-error">{mythOfDayError}</p>}

          {mythOfDay && (
            <>
              <p className="dashboard-myth-day-label myth">Myth ❌</p>
              <p className="dashboard-myth-day-text">{mythOfDay.myth}</p>

              <div className="dashboard-myth-day-fact">
                <p className="dashboard-myth-day-label fact">Fact ✅</p>
                <p className="dashboard-myth-day-text">{mythOfDay.fact}</p>
                <p className="dashboard-myth-day-source">{formatSourceLabel(mythOfDay.source)}</p>
              </div>

              <p className="dashboard-myth-day-meta">{mythOfDay.category}</p>
            </>
          )}
        </motion.section>

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
          className="dashboard-countdown-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.09 }}
        >
          <p className="tracker-results-kicker">Cycle Countdown</p>
          <h3 className="tracker-results-heading">Upcoming Events</h3>
          <p className="dashboard-countdown-line">{countdownMessages.nextPeriodText}</p>
          <p className="dashboard-countdown-line">{countdownMessages.ovulationText}</p>
          {cycleData.isApproximatePrediction ? (
            <p className="dashboard-approx-note">These predictions are approximate until more cycle data is logged.</p>
          ) : null}
        </motion.section>

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
          <CycleCalendar
            predictionData={calendarPrediction}
            cycleHistory={cycleHistory}
            onPredictionRangeRequest={handleCalendarPredictionRequest}
            onCycleLogged={handleCycleLogged}
          />
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
          <button type="button" className="btn-primary" onClick={() => navigate("/mood")}>
            Mood Tracker
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate("/chatbot")}>
            Chat Support
          </button>
        </motion.div>

        <p className="link-row dashboard-link-row">
          <Link to="/cycle">Update cycle details</Link>
        </p>
      </section>
    </PageFrame>
  );
}


