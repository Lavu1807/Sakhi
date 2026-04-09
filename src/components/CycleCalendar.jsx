import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { addDays, formatDisplayDate, parseInputDate } from "../utils/cycleUtils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 24 * 60 * 60 * 1000;
const MENSTRUAL_LENGTH = 5;

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function getCycleDay(date, lastPeriodStart, cycleLength) {
  const dateDiff = Math.floor((startOfDay(date).getTime() - startOfDay(lastPeriodStart).getTime()) / DAY_MS);
  return ((dateDiff % cycleLength) + cycleLength) % cycleLength + 1;
}

function getOvulationDay(cycleLength) {
  return Math.max(1, Math.round(cycleLength) - 14);
}

function getPhaseForCycleDay(dayInCycle, cycleLength) {
  const menstrualEnd = Math.min(MENSTRUAL_LENGTH, cycleLength);
  const ovulationDay = getOvulationDay(cycleLength);

  if (dayInCycle <= menstrualEnd) {
    return {
      phase: "Menstrual",
      ovulationDay,
    };
  }

  if (dayInCycle < ovulationDay) {
    return {
      phase: "Follicular",
      ovulationDay,
    };
  }

  if (dayInCycle === ovulationDay) {
    return {
      phase: "Ovulation",
      ovulationDay,
    };
  }

  return {
    phase: "Luteal",
    ovulationDay,
  };
}

function getPhaseClassSuffix(phase) {
  return String(phase || "").toLowerCase();
}

function getDateStatus(date, lastPeriodStart, cycleLength) {
  const dayInCycle = getCycleDay(date, lastPeriodStart, cycleLength);
  const phaseData = getPhaseForCycleDay(dayInCycle, cycleLength);

  return {
    dayInCycle,
    phase: phaseData.phase,
    ovulationDay: phaseData.ovulationDay,
    isPeriod: phaseData.phase === "Menstrual",
    isOvulation: phaseData.phase === "Ovulation",
  };
}

function getUpcomingCycleInfo(lastPeriodStart, cycleLength) {
  const today = startOfDay(new Date());
  const dayInCycle = getCycleDay(today, lastPeriodStart, cycleLength);
  const ovulationDay = getOvulationDay(cycleLength);

  const daysUntilNextPeriod = cycleLength - dayInCycle + 1;
  const nextPeriodDate = addDays(today, daysUntilNextPeriod);

  const daysUntilOvulation =
    dayInCycle <= ovulationDay ? ovulationDay - dayInCycle : cycleLength - dayInCycle + ovulationDay;
  const ovulationDate = addDays(today, daysUntilOvulation);

  return {
    nextPeriodDate,
    ovulationDate,
  };
}

function getCalendarGridDays(viewDate) {
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = addDays(monthStart, -monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export default function CycleCalendar({ lastPeriodDate, cycleLength }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const parsedStartDate = useMemo(() => parseInputDate(lastPeriodDate), [lastPeriodDate]);
  const cycleLengthNumber = Number(cycleLength);

  const hasCycleData = Boolean(
    parsedStartDate && Number.isFinite(cycleLengthNumber) && !Number.isNaN(cycleLengthNumber) && cycleLengthNumber > 0,
  );

  const monthLabel = useMemo(
    () =>
      viewDate.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    [viewDate],
  );

  const calendarDays = useMemo(() => getCalendarGridDays(viewDate), [viewDate]);

  const upcomingCycleInfo = useMemo(() => {
    if (!hasCycleData) {
      return null;
    }

    return getUpcomingCycleInfo(parsedStartDate, cycleLengthNumber);
  }, [hasCycleData, parsedStartDate, cycleLengthNumber]);

  const selectedDateStatus = useMemo(() => {
    if (!hasCycleData) {
      return null;
    }

    return getDateStatus(selectedDate, parsedStartDate, cycleLengthNumber);
  }, [hasCycleData, selectedDate, parsedStartDate, cycleLengthNumber]);

  function goToPreviousMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
          const isOutsideMonth = date.getMonth() !== viewDate.getMonth();
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const dateStatus = hasCycleData ? getDateStatus(date, parsedStartDate, cycleLengthNumber) : null;
          const phaseClassSuffix = dateStatus ? getPhaseClassSuffix(dateStatus.phase) : "";

          const dayClassNames = ["calendar-day"];
          if (isOutsideMonth) dayClassNames.push("outside-month");
          if (phaseClassSuffix) dayClassNames.push(`phase-${phaseClassSuffix}`);
          if (dateStatus?.isPeriod) dayClassNames.push("period-strong");
          if (dateStatus?.isOvulation) dayClassNames.push("ovulation-strong");
          if (isToday) dayClassNames.push("today-day");
          if (isSelected) dayClassNames.push("selected-day");

          const dateAriaLabel = dateStatus
            ? `${date.toDateString()} - ${dateStatus.phase} phase, cycle day ${dateStatus.dayInCycle}`
            : date.toDateString();

          return (
            <button
              type="button"
              key={date.toISOString()}
              className={dayClassNames.join(" ")}
              onClick={() => setSelectedDate(startOfDay(date))}
              aria-label={dateAriaLabel}
              role="gridcell"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend" aria-label="Calendar legend">
        <span className="calendar-legend-item">
          <span className="legend-dot menstrual" aria-hidden="true" /> Menstrual (light pink)
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot follicular" aria-hidden="true" /> Follicular (light blue)
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot ovulation" aria-hidden="true" /> Ovulation (purple)
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot luteal" aria-hidden="true" /> Luteal (light yellow)
        </span>
      </div>

      {hasCycleData ? (
        <>
          <div className="calendar-selection-box">
            <p className="calendar-selection-date">{formatDisplayDate(selectedDate)}</p>
            <div className="calendar-selection-tags">
              <span className="calendar-chip">Cycle day {selectedDateStatus?.dayInCycle}</span>
              {selectedDateStatus?.phase && (
                <span
                  className={`calendar-chip phase-chip phase-${getPhaseClassSuffix(selectedDateStatus.phase)}-chip`}
                >
                  {selectedDateStatus.phase}
                </span>
              )}
              {selectedDateStatus?.isPeriod && <span className="calendar-chip period">Period day</span>}
              {selectedDateStatus?.isOvulation && <span className="calendar-chip ovulation">Ovulation day</span>}
              {isSameDay(selectedDate, today) && <span className="calendar-chip today">Today</span>}
            </div>
          </div>

          <div className="calendar-upcoming-box">
            <p>
              <strong>Next period:</strong> {formatDisplayDate(upcomingCycleInfo.nextPeriodDate)}
            </p>
            <p>
              <strong>Ovulation:</strong> {formatDisplayDate(upcomingCycleInfo.ovulationDate)}
            </p>
          </div>
        </>
      ) : (
        <p className="calendar-empty-state">Track cycle details to view adaptive phase highlights on your calendar.</p>
      )}
    </section>
  );
}

CycleCalendar.propTypes = {
  lastPeriodDate: PropTypes.string,
  cycleLength: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

CycleCalendar.defaultProps = {
  lastPeriodDate: "",
  cycleLength: "",
};
