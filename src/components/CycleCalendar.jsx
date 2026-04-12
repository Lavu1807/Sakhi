import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { addCycleEntry, addDailyLog, getCycleStatus, getDailyLogForDate, getDailyLogs, markPeriodEnd } from "../utils/api";
import { getAuthToken } from "../utils/auth";
import { addDays, formatDisplayDate } from "../utils/cycleUtils";
import { saveMoodChatContext } from "../utils/moodContext";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const QUICK_MOOD_OPTIONS = [
  { value: "happy", emoji: "😊", label: "Happy" },
  { value: "calm", emoji: "😌", label: "Calm" },
  { value: "anxious", emoji: "😟", label: "Anxious" },
  { value: "irritated", emoji: "😠", label: "Irritated" },
  { value: "sad", emoji: "😢", label: "Sad" },
];
const MOOD_EMOJI = {
  happy: "😊",
  calm: "😌",
  anxious: "😟",
  irritated: "😠",
  sad: "😢",
};
const QUICK_SYMPTOM_OPTIONS = [
  { key: "cramps", icon: "◉", label: "Cramps" },
  { key: "headache", icon: "◆", label: "Headache" },
  { key: "fatigue", icon: "●", label: "Fatigue" },
  { key: "bloating", icon: "○", label: "Bloating" },
];
const PHASE_INSIGHT_MESSAGES = {
  Menstrual: "Your body may need extra rest and hydration in this phase.",
  Follicular: "Energy often rises in this phase, making it good for planning.",
  Ovulation: "You may feel more energetic and social around ovulation.",
  Luteal: "Prioritize sleep and steady routines in luteal days.",
};

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISODate(value) {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function getPhaseClassSuffix(phase) {
  return String(phase || "").toLowerCase();
}

function getSymptomsFromLog(entry) {
  if (!entry || typeof entry !== "object") {
    return [];
  }

  const symptomMap = [
    ["cramps", "Cramps"],
    ["headache", "Headache"],
    ["fatigue", "Fatigue"],
    ["bloating", "Bloating"],
  ];

  return symptomMap
    .filter(([key]) => Boolean(entry[key]))
    .map(([, label]) => label);
}

function getSymptomKeysFromLog(entry) {
  if (!entry || typeof entry !== "object") {
    return [];
  }

  return QUICK_SYMPTOM_OPTIONS.filter((item) => Boolean(entry[item.key])).map((item) => item.key);
}

function createEmptySymptomSelection() {
  return {
    cramps: false,
    headache: false,
    fatigue: false,
    bloating: false,
  };
}

function toISODateFromDate(date) {
  return toISODate(startOfDay(date));
}

function isWithinIsoRange(dateKey, startDate, endDate) {
  if (!startDate || !endDate) {
    return false;
  }

  return dateKey >= startDate && dateKey <= endDate;
}

function getPredictionEventsForDate(dateKey, predictionData, todayKey) {
  const isFutureOrToday = dateKey >= todayKey;

  if (!isFutureOrToday) {
    return {
      isPredictedNextPeriod: false,
      isPredictedOvulation: false,
      isPredictedFertileWindow: false,
    };
  }

  return {
    isPredictedNextPeriod: dateKey === predictionData?.nextPeriodDate,
    isPredictedOvulation: dateKey === predictionData?.ovulationDate,
    isPredictedFertileWindow: isWithinIsoRange(dateKey, predictionData?.fertileWindowStart, predictionData?.fertileWindowEnd),
  };
}

function buildDateTooltip({ date, status, dayLog, eventFlags, periodState }) {
  const parts = [date.toDateString()];

  if (periodState === "ongoing") {
    parts.push("Logged ongoing period");
  } else if (periodState === "completed") {
    parts.push("Logged completed period");
  }

  if (status?.phase) {
    parts.push(`${status.phase} phase`);
  }

  if (Number.isFinite(Number(status?.cycleDay))) {
    parts.push(`Cycle day ${status.cycleDay}`);
  }

  if (eventFlags.isPredictedNextPeriod) {
    parts.push("Predicted next period");
  }

  if (eventFlags.isPredictedOvulation) {
    parts.push("Predicted ovulation");
  }

  if (eventFlags.isPredictedFertileWindow) {
    parts.push("Predicted fertile window");
  }

  const moodEmoji = MOOD_EMOJI[String(dayLog?.mood || "").toLowerCase()] || "";
  if (dayLog?.mood) {
    parts.push(`Mood: ${moodEmoji ? `${moodEmoji} ` : ""}${dayLog.mood}`);
  }

  const symptoms = getSymptomsFromLog(dayLog);
  if (symptoms.length > 0) {
    parts.push(`Symptoms: ${symptoms.join(", ")}`);
  }

  return parts.join(" | ");
}

function isValidISODateKey(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildUserPeriodMap(cycleHistory, todayKey) {
  const map = {};
  const safeTodayKey = isValidISODateKey(todayKey) ? todayKey : toISODate(new Date());

  for (const entry of Array.isArray(cycleHistory) ? cycleHistory : []) {
    const periodStartDate = String(entry?.period_start_date || "").slice(0, 10);
    const rawPeriodEndDate = String(entry?.period_end_date || "").slice(0, 10);
    const hasValidStartDate = isValidISODateKey(periodStartDate);
    const hasValidEndDate = isValidISODateKey(rawPeriodEndDate);
    const isOngoing = Boolean(entry?.is_period_ongoing) && !hasValidEndDate;

    if (!hasValidStartDate) {
      continue;
    }

    if (!isOngoing && !hasValidEndDate) {
      continue;
    }

    const rangeEndDateKey = isOngoing ? safeTodayKey : rawPeriodEndDate;
    if (rangeEndDateKey < periodStartDate) {
      continue;
    }

    let cursorDate = startOfDay(new Date(`${periodStartDate}T00:00:00`));
    const rangeEndDate = startOfDay(new Date(`${rangeEndDateKey}T00:00:00`));
    const periodState = isOngoing ? "ongoing" : "completed";

    while (cursorDate <= rangeEndDate) {
      const dateKey = toISODate(cursorDate);

      if (periodState === "ongoing" || map[dateKey] !== "ongoing") {
        map[dateKey] = periodState;
      }

      cursorDate = addDays(cursorDate, 1);
    }
  }

  return map;
}

function buildDailyLogMap(entries) {
  const map = {};
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry?.log_date) {
      map[entry.log_date] = entry;
    }
  }

  return map;
}

function resolveHistoricalPattern(phase, dailyLogMap, predictionByDate) {
  if (!phase) {
    return "Keep tracking to unlock phase-wise patterns.";
  }

  const matchingLogs = Object.values(dailyLogMap).filter((entry) => predictionByDate[entry.log_date]?.phase === phase);

  if (matchingLogs.length < 2) {
    return "Add more logs in this phase to detect your pattern.";
  }

  const symptomCounts = {
    cramps: 0,
    headache: 0,
    fatigue: 0,
    bloating: 0,
  };

  const moodCounts = {
    happy: 0,
    calm: 0,
    anxious: 0,
    irritated: 0,
    sad: 0,
  };

  for (const entry of matchingLogs) {
    const mood = String(entry?.mood || "").trim().toLowerCase();
    if (moodCounts[mood] !== undefined) {
      moodCounts[mood] += 1;
    }

    for (const item of QUICK_SYMPTOM_OPTIONS) {
      if (entry[item.key]) {
        symptomCounts[item.key] += 1;
      }
    }
  }

  const topSymptom = QUICK_SYMPTOM_OPTIONS.map((item) => ({ ...item, count: symptomCounts[item.key] || 0 })).sort(
    (a, b) => b.count - a.count,
  )[0];

  if (topSymptom && topSymptom.count >= 2) {
    return `You often report ${topSymptom.label.toLowerCase()} in ${phase.toLowerCase()} phase.`;
  }

  const topMoodEntry = Object.entries(moodCounts)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)[0];

  if (topMoodEntry && topMoodEntry.count >= 2) {
    return `You are often ${topMoodEntry.key} in ${phase.toLowerCase()} phase.`;
  }

  return "Your logs in this phase are balanced so far.";
}

function getCalendarGridDays(viewDate) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function getVisibleGridRange(viewDate) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const gridEnd = addDays(gridStart, 41);

  return {
    from: toISODate(gridStart),
    to: toISODate(gridEnd),
  };
}

function buildPredictionMap(predictionData) {
  const phaseCalendar = Array.isArray(predictionData?.phaseCalendar) ? predictionData.phaseCalendar : [];
  const map = {};

  for (const item of phaseCalendar) {
    if (item?.date) {
      map[item.date] = item;
    }
  }

  return map;
}

export default function CycleCalendar({ predictionData, cycleHistory, onPredictionRangeRequest, onCycleLogged }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = useMemo(() => toISODate(today), [today]);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedDayLog, setSelectedDayLog] = useState(null);
  const [dailyLogsByDate, setDailyLogsByDate] = useState({});
  const [isLoadingDayLog, setIsLoadingDayLog] = useState(false);
  const [isLoadingVisibleLogs, setIsLoadingVisibleLogs] = useState(false);
  const [dayLogError, setDayLogError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [isMarkingPeriod, setIsMarkingPeriod] = useState(false);
  const [isSavingMood, setIsSavingMood] = useState(false);
  const [isSavingSymptoms, setIsSavingSymptoms] = useState(false);
  const [isMarkingPeriodEnd, setIsMarkingPeriodEnd] = useState(false);
  const [quickMood, setQuickMood] = useState("");
  const [quickSymptoms, setQuickSymptoms] = useState(() => createEmptySymptomSelection());
  const [ongoingPeriodStatus, setOngoingPeriodStatus] = useState(null);

  const monthLabel = useMemo(
    () =>
      viewDate.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    [viewDate],
  );

  const calendarDays = useMemo(() => getCalendarGridDays(viewDate), [viewDate]);
  const predictionByDate = useMemo(() => buildPredictionMap(predictionData), [predictionData]);
  const userPeriodByDate = useMemo(() => buildUserPeriodMap(cycleHistory, todayKey), [cycleHistory, todayKey]);
  const selectedDateKey = useMemo(() => toISODate(selectedDate), [selectedDate]);
  const selectedDateStatus = predictionByDate[selectedDateKey] || null;
  const selectedDatePeriodState = userPeriodByDate[selectedDateKey] || "";
  const selectedSymptoms = useMemo(() => getSymptomsFromLog(selectedDayLog), [selectedDayLog]);
  const selectedHistoricalPattern = useMemo(
    () => resolveHistoricalPattern(selectedDateStatus?.phase, dailyLogsByDate, predictionByDate),
    [selectedDateStatus?.phase, dailyLogsByDate, predictionByDate],
  );
  const selectedPhaseInsight = useMemo(
    () => PHASE_INSIGHT_MESSAGES[selectedDateStatus?.phase] || "Track this phase for more personalized guidance.",
    [selectedDateStatus?.phase],
  );
  const ongoingPeriodStartDate = String(ongoingPeriodStatus?.periodStartDate || "");
  const hasOngoingPeriod = Boolean(
    ongoingPeriodStatus?.isPeriodOngoing && !ongoingPeriodStatus?.periodEndDate && ongoingPeriodStartDate,
  );
  const canMarkPeriodEnd = Boolean(hasOngoingPeriod && selectedDateKey >= ongoingPeriodStartDate);

  const refreshOngoingPeriodStatus = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setOngoingPeriodStatus(null);
      return;
    }

    try {
      const response = await getCycleStatus(token);
      const status = response?.status;
      if (status?.isPeriodOngoing && !status?.periodEndDate && status?.periodStartDate) {
        setOngoingPeriodStatus({
          periodStartDate: status.periodStartDate,
          periodEndDate: status.periodEndDate || null,
          isPeriodOngoing: true,
        });
      } else {
        setOngoingPeriodStatus(null);
      }
    } catch {
      setOngoingPeriodStatus(null);
    }
  }, []);

  function applyLogToSelection(log) {
    setSelectedDayLog(log || null);
    setQuickMood(log?.mood ? String(log.mood).toLowerCase() : "");

    const nextSymptoms = createEmptySymptomSelection();
    for (const key of getSymptomKeysFromLog(log)) {
      nextSymptoms[key] = true;
    }
    setQuickSymptoms(nextSymptoms);
  }

  useEffect(() => {
    if (typeof onPredictionRangeRequest !== "function") {
      return;
    }

    onPredictionRangeRequest(getVisibleGridRange(viewDate));
  }, [onPredictionRangeRequest, viewDate]);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    refreshOngoingPeriodStatus();
  }, [isPanelOpen, refreshOngoingPeriodStatus]);

  useEffect(() => {
    async function loadVisibleLogs() {
      const token = getAuthToken();
      if (!token) {
        setDailyLogsByDate({});
        return;
      }

      const range = getVisibleGridRange(viewDate);
      setIsLoadingVisibleLogs(true);

      try {
        const response = await getDailyLogs(token, {
          from: range.from,
          to: range.to,
        });

        setDailyLogsByDate(buildDailyLogMap(response?.entries));
      } catch {
        setDailyLogsByDate({});
      } finally {
        setIsLoadingVisibleLogs(false);
      }
    }

    loadVisibleLogs();
  }, [viewDate]);

  useEffect(() => {
    applyLogToSelection(dailyLogsByDate[selectedDateKey] || null);
  }, [selectedDateKey, dailyLogsByDate]);

  useEffect(() => {
    async function loadDayLog() {
      if (!isPanelOpen) {
        return;
      }

      const token = getAuthToken();
      if (!token) {
        setSelectedDayLog(null);
        setDayLogError("Please login again to view day details.");
        return;
      }

      setIsLoadingDayLog(true);
      setDayLogError("");

      try {
        const log = await getDailyLogForDate(token, selectedDateKey);
        applyLogToSelection(log);

        setDailyLogsByDate((previous) => {
          const next = { ...previous };
          if (log) {
            next[selectedDateKey] = log;
          } else {
            delete next[selectedDateKey];
          }

          return next;
        });
      } catch (error) {
        applyLogToSelection(null);
        setDayLogError(error.message || "Unable to load day details.");
      } finally {
        setIsLoadingDayLog(false);
      }
    }

    loadDayLog();
  }, [isPanelOpen, selectedDateKey]);

  function goToPreviousMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function handleDateClick(date) {
    setSelectedDate(startOfDay(date));
    setIsPanelOpen(true);
    setActionMessage("");
    setDayLogError("");
  }

  async function handleMarkPeriodStart() {
    const token = getAuthToken();
    if (!token) {
      setActionMessage("Please login again to log cycle data.");
      return;
    }

    setIsMarkingPeriod(true);
    setActionMessage("");

    try {
      await addCycleEntry(
        {
          period_start_date: selectedDateKey,
          source: "calendar",
        },
        token,
      );

      setActionMessage("Period start marked and adaptive prediction updated.");
      await refreshOngoingPeriodStatus();

      if (typeof onCycleLogged === "function") {
        onCycleLogged(getVisibleGridRange(viewDate));
      }
    } catch (error) {
      setActionMessage(error.message || "Unable to mark period start.");
    } finally {
      setIsMarkingPeriod(false);
    }
  }

  async function handleMarkPeriodEnd() {
    const token = getAuthToken();
    if (!token) {
      setActionMessage("Please login again to update cycle data.");
      return;
    }

    if (!hasOngoingPeriod) {
      setActionMessage("No ongoing period is currently tracked.");
      return;
    }

    if (!canMarkPeriodEnd) {
      setActionMessage("Select a date on or after the tracked period start date.");
      return;
    }

    setIsMarkingPeriodEnd(true);
    setActionMessage("");

    try {
      await markPeriodEnd(
        {
          period_start_date: ongoingPeriodStartDate,
          period_end_date: selectedDateKey,
        },
        token,
      );

      setActionMessage(`Period end marked for ${formatDisplayDate(selectedDate)}.`);
      await refreshOngoingPeriodStatus();

      if (typeof onCycleLogged === "function") {
        onCycleLogged(getVisibleGridRange(viewDate));
      }
    } catch (error) {
      setActionMessage(error.message || "Unable to mark period end.");
    } finally {
      setIsMarkingPeriodEnd(false);
    }
  }

  async function handleSaveMood() {
    const token = getAuthToken();

    if (!token) {
      setActionMessage("Please login again to save mood.");
      return;
    }

    if (!quickMood) {
      setActionMessage("Select a mood before saving.");
      return;
    }

    setIsSavingMood(true);
    setActionMessage("");

    try {
      const response = await addDailyLog(
        {
          log_date: selectedDateKey,
          mood: quickMood,
        },
        token,
      );

      const savedLog = response?.entry || null;
      applyLogToSelection(savedLog);
      setDailyLogsByDate((previous) => ({
        ...previous,
        [selectedDateKey]: savedLog,
      }));

      saveMoodChatContext({
        latestMood: quickMood,
        latestMoodDate: selectedDateKey,
        latestMoodPhase: selectedDateStatus?.phase || "",
        latestMoodIntensity: 3,
        latestMoodNote: "",
      });

      setActionMessage("Mood saved instantly.");
    } catch (error) {
      setActionMessage(error.message || "Unable to save mood.");
    } finally {
      setIsSavingMood(false);
    }
  }

  function toggleQuickSymptom(symptomKey) {
    setQuickSymptoms((previous) => ({
      ...previous,
      [symptomKey]: !previous[symptomKey],
    }));
  }

  async function handleSaveSymptoms() {
    const token = getAuthToken();

    if (!token) {
      setActionMessage("Please login again to save symptoms.");
      return;
    }

    setIsSavingSymptoms(true);
    setActionMessage("");

    try {
      const response = await addDailyLog(
        {
          log_date: selectedDateKey,
          cramps: Boolean(quickSymptoms.cramps),
          headache: Boolean(quickSymptoms.headache),
          fatigue: Boolean(quickSymptoms.fatigue),
          bloating: Boolean(quickSymptoms.bloating),
        },
        token,
      );

      const savedLog = response?.entry || null;
      applyLogToSelection(savedLog);
      setDailyLogsByDate((previous) => ({
        ...previous,
        [selectedDateKey]: savedLog,
      }));

      setActionMessage("Symptoms saved instantly.");
    } catch (error) {
      setActionMessage(error.message || "Unable to save symptoms.");
    } finally {
      setIsSavingSymptoms(false);
    }
  }

  return (
    <section className="dashboard-calendar-card" aria-label="Cycle calendar">
      <div className="calendar-top-row">
        <div>
          <p className="calendar-kicker">Cycle Calendar</p>
          <h3 className="calendar-month-title">{monthLabel}</h3>
        </div>

        <div className="calendar-month-nav" aria-label="Change month">
          <button type="button" className="calendar-nav-btn" onClick={goToPreviousMonth} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className="calendar-nav-btn" onClick={goToNextMonth} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="calendar-grid" role="grid" aria-label="Monthly cycle calendar">
        {WEEKDAY_LABELS.map((day) => (
          <span key={day} className="calendar-weekday" role="columnheader">
            {day}
          </span>
        ))}

        {calendarDays.map((date) => {
          const dateKey = toISODateFromDate(date);
          const isOutsideMonth = date.getMonth() !== viewDate.getMonth();
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const dateStatus = predictionByDate[dateKey] || null;
          const actualPeriodState = userPeriodByDate[dateKey] || "";
          const dayLog = dailyLogsByDate[dateKey] || null;
          const eventFlags = getPredictionEventsForDate(dateKey, predictionData, todayKey);
          const phaseClassSuffix = dateStatus ? getPhaseClassSuffix(dateStatus.phase) : "";

          const dayClassNames = ["calendar-day"];
          if (isOutsideMonth) dayClassNames.push("outside-month");
          if (phaseClassSuffix && !actualPeriodState) dayClassNames.push(`phase-${phaseClassSuffix}`);
          if (!actualPeriodState && dateStatus?.isPeriod) dayClassNames.push("period-strong");
          if (actualPeriodState === "ongoing") dayClassNames.push("period-user-ongoing");
          if (actualPeriodState === "completed") dayClassNames.push("period-user-completed");
          if (dateStatus?.isOvulation) dayClassNames.push("ovulation-strong");
          if (dateStatus?.isFertile) dayClassNames.push("fertile-day");
          if (eventFlags.isPredictedNextPeriod) dayClassNames.push("event-next-period");
          if (eventFlags.isPredictedOvulation) dayClassNames.push("event-ovulation");
          if (eventFlags.isPredictedFertileWindow) dayClassNames.push("event-fertile-window");
          if (isToday) dayClassNames.push("today-day");
          if (isSelected) dayClassNames.push("selected-day");

          const dateAriaLabel = dateStatus
            ? `${date.toDateString()} - ${dateStatus.phase} phase, cycle day ${dateStatus.cycleDay}`
            : date.toDateString();
          const moodEmoji = MOOD_EMOJI[String(dayLog?.mood || "").toLowerCase()] || "";
          const symptomIcons = QUICK_SYMPTOM_OPTIONS.filter((item) => dayLog?.[item.key]).map((item) => item.icon);
          const hoverTitle = buildDateTooltip({
            date,
            status: dateStatus,
            dayLog,
            eventFlags,
            periodState: actualPeriodState,
          });

          return (
            <button
              type="button"
              key={date.toISOString()}
              className={dayClassNames.join(" ")}
              onClick={() => handleDateClick(date)}
              aria-label={dateAriaLabel}
              role="gridcell"
              title={hoverTitle}
            >
              <span className="calendar-day-number">{date.getDate()}</span>
              {moodEmoji || symptomIcons.length > 0 ? (
                <span className="calendar-day-indicators" aria-hidden="true">
                  {moodEmoji ? <span className="calendar-day-mood-indicator">{moodEmoji}</span> : null}
                  {symptomIcons.slice(0, 2).map((icon, index) => (
                    <span key={`${dateKey}-${icon}-${index}`} className="calendar-day-symptom-indicator">
                      {icon}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend" aria-label="Calendar legend">
        <span className="calendar-legend-item">
          <span className="legend-dot menstrual" aria-hidden="true" /> Menstrual (red)
        </span>
        <span className="calendar-legend-item">
          <span className="legend-period ongoing" aria-hidden="true" /> Logged ongoing period
        </span>
        <span className="calendar-legend-item">
          <span className="legend-period completed" aria-hidden="true" /> Logged completed period
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot follicular" aria-hidden="true" /> Follicular (blue)
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot ovulation" aria-hidden="true" /> Ovulation (green)
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot luteal" aria-hidden="true" /> Luteal (yellow)
        </span>
        <span className="calendar-legend-item">
          <span className="legend-event next" aria-hidden="true" /> Predicted next period
        </span>
        <span className="calendar-legend-item">
          <span className="legend-event ovulation" aria-hidden="true" /> Predicted ovulation
        </span>
        <span className="calendar-legend-item">
          <span className="legend-event fertile" aria-hidden="true" /> Predicted fertile window
        </span>
      </div>

      {selectedDateStatus ? (
        <>
          <div className="calendar-selection-box">
            <p className="calendar-selection-date">{formatDisplayDate(selectedDate)}</p>
            <div className="calendar-selection-tags">
              <span className="calendar-chip">Cycle day {selectedDateStatus?.cycleDay}</span>
              {selectedDateStatus?.phase && (
                <span
                  className={`calendar-chip phase-chip phase-${getPhaseClassSuffix(selectedDateStatus.phase)}-chip`}
                >
                  {selectedDateStatus.phase}
                </span>
              )}
              {selectedDatePeriodState === "ongoing" && (
                <span className="calendar-chip period-user-ongoing-chip">Ongoing period (logged)</span>
              )}
              {selectedDatePeriodState === "completed" && (
                <span className="calendar-chip period-user-completed-chip">Completed period (logged)</span>
              )}
              {selectedDatePeriodState === "" && selectedDateStatus?.isPeriod && (
                <span className="calendar-chip period">Predicted period day</span>
              )}
              {selectedDateStatus?.isOvulation && <span className="calendar-chip ovulation">Ovulation day</span>}
              {selectedDateStatus?.isFertile && <span className="calendar-chip fertile">Fertile window</span>}
              {isSameDay(selectedDate, today) && <span className="calendar-chip today">Today</span>}
            </div>
          </div>

          <div className="calendar-upcoming-box">
            <p>
              <strong>Next period:</strong> {formatDisplayDate(predictionData?.nextPeriodDate)}
            </p>
            <p>
              <strong>Ovulation:</strong> {formatDisplayDate(predictionData?.ovulationDate)}
            </p>
            <p>
              <strong>Fertile window:</strong> {formatDisplayDate(predictionData?.fertileWindowStart)} -{" "}
              {formatDisplayDate(predictionData?.fertileWindowEnd)}
            </p>
            {predictionData?.isApproximatePrediction ? (
              <p className="calendar-prediction-approx-note">Predictions are approximate while data is limited.</p>
            ) : null}
          </div>
        </>
      ) : (
        <p className="calendar-empty-state">Adaptive prediction data is loading. Click a date to open day details.</p>
      )}

      {isLoadingVisibleLogs ? <p className="calendar-day-subtle">Loading daily indicators...</p> : null}

      {isPanelOpen && (
        <div className="calendar-day-panel-overlay" role="dialog" aria-modal="true" aria-label="Day details">
          <aside className="calendar-day-panel">
            <div className="calendar-day-panel-top">
              <div>
                <p className="calendar-day-panel-kicker">Daily Dashboard</p>
                <h4>{formatDisplayDate(selectedDate)}</h4>
              </div>
              <button
                type="button"
                className="calendar-day-panel-close"
                onClick={() => setIsPanelOpen(false)}
                aria-label="Close day details"
              >
                ✕
              </button>
            </div>

            <div className="calendar-day-detail-grid">
              <article className="calendar-day-detail-item">
                <p className="calendar-day-detail-label">Cycle Day</p>
                <p className="calendar-day-detail-value">{selectedDateStatus?.cycleDay || "--"}</p>
              </article>

              <article className="calendar-day-detail-item">
                <p className="calendar-day-detail-label">Phase</p>
                <p className="calendar-day-detail-value">{selectedDateStatus?.phase || "Not available"}</p>
              </article>
            </div>

            {isLoadingDayLog ? <p className="calendar-day-subtle">Loading mood and symptoms...</p> : null}
            {dayLogError ? <p className="field-error">{dayLogError}</p> : null}

            {!isLoadingDayLog && !dayLogError ? (
              <>
                <div className="calendar-day-log-row">
                  <p className="calendar-day-detail-label">Mood</p>
                  <p className="calendar-day-detail-value">
                    {selectedDayLog?.mood ? `${MOOD_EMOJI[String(selectedDayLog.mood).toLowerCase()] || ""} ${selectedDayLog.mood}` : "Not logged"}
                  </p>
                </div>

                <div className="calendar-day-log-row">
                  <p className="calendar-day-detail-label">Symptoms</p>
                  {selectedSymptoms.length > 0 ? (
                    <div className="calendar-day-symptom-tags">
                      {selectedSymptoms.map((symptom) => (
                        <span key={symptom} className="calendar-chip">
                          {symptom}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="calendar-day-detail-value">Not logged</p>
                  )}
                </div>

                <section className="calendar-quick-section">
                  <p className="calendar-day-detail-label">Quick Mood Log</p>
                  <div className="calendar-quick-mood-grid">
                    {QUICK_MOOD_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`calendar-quick-mood-btn${quickMood === option.value ? " active" : ""}`}
                        onClick={() => setQuickMood(option.value)}
                        aria-pressed={quickMood === option.value}
                      >
                        <span aria-hidden="true">{option.emoji}</span> {option.label}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="calendar-quick-save-btn" onClick={handleSaveMood} disabled={isSavingMood}>
                    {isSavingMood ? "Saving mood..." : "Save Mood"}
                  </button>
                </section>

                <section className="calendar-quick-section">
                  <p className="calendar-day-detail-label">Quick Symptom Log</p>
                  <div className="calendar-quick-symptom-row">
                    {QUICK_SYMPTOM_OPTIONS.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`calendar-quick-symptom-chip${quickSymptoms[item.key] ? " active" : ""}`}
                        onClick={() => toggleQuickSymptom(item.key)}
                        aria-pressed={quickSymptoms[item.key]}
                        title={item.label}
                      >
                        <span aria-hidden="true">{item.icon}</span> {item.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="calendar-quick-save-btn"
                    onClick={handleSaveSymptoms}
                    disabled={isSavingSymptoms}
                  >
                    {isSavingSymptoms ? "Saving symptoms..." : "Save Symptoms"}
                  </button>
                </section>

                <section className="calendar-quick-section calendar-insight-section">
                  <p className="calendar-day-detail-label">Insights</p>
                  <p className="calendar-day-subtle">{selectedPhaseInsight}</p>
                  <p className="calendar-day-subtle">{selectedHistoricalPattern}</p>
                  {predictionData?.isApproximatePrediction ? (
                    <p className="calendar-day-subtle">These date predictions are currently approximate.</p>
                  ) : null}
                </section>
              </>
            ) : null}

            <div className="calendar-day-actions">
              <button type="button" className="btn-primary" onClick={handleMarkPeriodStart} disabled={isMarkingPeriod}>
                {isMarkingPeriod ? "Marking..." : "Mark Period Start"}
              </button>
              <button
                type="button"
                className="calendar-day-ghost-btn"
                onClick={handleMarkPeriodEnd}
                disabled={isMarkingPeriodEnd || !canMarkPeriodEnd}
              >
                {isMarkingPeriodEnd ? "Marking end..." : "Mark Period End"}
              </button>
            </div>

            {hasOngoingPeriod ? (
              <p className="calendar-day-subtle">
                Ongoing period started on {formatDisplayDate(ongoingPeriodStartDate)}.
                {canMarkPeriodEnd
                  ? " Select this day to mark its end."
                  : " Select a date on or after the start date to mark end."}
              </p>
            ) : (
              <p className="calendar-day-subtle">No ongoing period is currently tracked.</p>
            )}

            {actionMessage ? <p className="calendar-day-subtle">{actionMessage}</p> : null}
          </aside>
        </div>
      )}
    </section>
  );
}

CycleCalendar.propTypes = {
  predictionData: PropTypes.shape({
    nextPeriodDate: PropTypes.string,
    ovulationDate: PropTypes.string,
    fertileWindowStart: PropTypes.string,
    fertileWindowEnd: PropTypes.string,
    isApproximatePrediction: PropTypes.bool,
    phaseCalendar: PropTypes.arrayOf(
      PropTypes.shape({
        date: PropTypes.string,
        cycleDay: PropTypes.number,
        phase: PropTypes.string,
        isPeriod: PropTypes.bool,
        isOvulation: PropTypes.bool,
        isFertile: PropTypes.bool,
      }),
    ),
  }),
  cycleHistory: PropTypes.arrayOf(
    PropTypes.shape({
      period_start_date: PropTypes.string,
      period_end_date: PropTypes.string,
      is_period_ongoing: PropTypes.bool,
    }),
  ),
  onPredictionRangeRequest: PropTypes.func,
  onCycleLogged: PropTypes.func,
};

CycleCalendar.defaultProps = {
  predictionData: {
    nextPeriodDate: "",
    ovulationDate: "",
    fertileWindowStart: "",
    fertileWindowEnd: "",
    isApproximatePrediction: false,
    phaseCalendar: [],
  },
  cycleHistory: [],
  onPredictionRangeRequest: undefined,
  onCycleLogged: undefined,
};
