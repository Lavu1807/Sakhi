import { useMemo, useState } from "react";
import PropTypes from "prop-types";
import { addDays, formatDisplayDate, parseInputDate } from "../utils/cycleUtils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_LENGTH = 5;

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

function getDateStatus(date, lastPeriodStart, cycleLength) {
  const dayInCycle = getCycleDay(date, lastPeriodStart, cycleLength);
  const ovulationDay = Math.max(1, cycleLength - 13);
  const fertileStart = Math.max(1, ovulationDay - 3);
  const fertileEnd = Math.max(0, ovulationDay - 1);

  return {
    dayInCycle,
    isPeriod: dayInCycle >= 1 && dayInCycle <= PERIOD_LENGTH,
    isOvulation: dayInCycle === ovulationDay,
    isFertile: fertileEnd >= fertileStart && dayInCycle >= fertileStart && dayInCycle <= fertileEnd,
  };
}

function getUpcomingCycleInfo(lastPeriodStart, cycleLength) {
  const today = startOfDay(new Date());
  const dayInCycle = getCycleDay(today, lastPeriodStart, cycleLength);
  const ovulationDay = Math.max(1, cycleLength - 13);
  const fertileDaysBefore = Math.min(3, Math.max(0, ovulationDay - 1));

  const daysUntilNextPeriod = cycleLength - dayInCycle + 1;
  const nextPeriodDate = addDays(today, daysUntilNextPeriod);

  const daysUntilOvulation =
    dayInCycle <= ovulationDay ? ovulationDay - dayInCycle : cycleLength - dayInCycle + ovulationDay;
  const ovulationDate = addDays(today, daysUntilOvulation);

  const fertileStart = fertileDaysBefore > 0 ? addDays(ovulationDate, -fertileDaysBefore) : null;
  const fertileEnd = fertileDaysBefore > 0 ? addDays(ovulationDate, -1) : null;

  return {
    nextPeriodDate,
    ovulationDate,
    fertileStart,
    fertileEnd,
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

          const dayClassNames = ["calendar-day"];
          if (isOutsideMonth) dayClassNames.push("outside-month");
          if (dateStatus?.isPeriod) dayClassNames.push("period-day");
          if (dateStatus?.isFertile) dayClassNames.push("fertile-day");
          if (dateStatus?.isOvulation) dayClassNames.push("ovulation-day");
          if (isToday) dayClassNames.push("today-day");
          if (isSelected) dayClassNames.push("selected-day");

          return (
            <button
              type="button"
              key={date.toISOString()}
              className={dayClassNames.join(" ")}
              onClick={() => setSelectedDate(startOfDay(date))}
              aria-label={date.toDateString()}
              role="gridcell"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="calendar-legend" aria-label="Calendar legend">
        <span className="calendar-legend-item">
          <span className="legend-dot period" aria-hidden="true" /> Pink: Period
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot ovulation" aria-hidden="true" /> Purple: Ovulation
        </span>
        <span className="calendar-legend-item">
          <span className="legend-dot fertile" aria-hidden="true" /> Light shade: Fertile days
        </span>
      </div>

      {hasCycleData ? (
        <>
          <div className="calendar-selection-box">
            <p className="calendar-selection-date">{formatDisplayDate(selectedDate)}</p>
            <div className="calendar-selection-tags">
              <span className="calendar-chip">Cycle day {selectedDateStatus?.dayInCycle}</span>
              {selectedDateStatus?.isPeriod && <span className="calendar-chip period">Period</span>}
              {selectedDateStatus?.isFertile && <span className="calendar-chip fertile">Fertile</span>}
              {selectedDateStatus?.isOvulation && <span className="calendar-chip ovulation">Ovulation</span>}
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
            <p>
              <strong>Fertile window:</strong>{" "}
              {upcomingCycleInfo.fertileStart && upcomingCycleInfo.fertileEnd
                ? `${formatDisplayDate(upcomingCycleInfo.fertileStart)} - ${formatDisplayDate(upcomingCycleInfo.fertileEnd)}`
                : "--"}
            </p>
          </div>
        </>
      ) : (
        <p className="calendar-empty-state">Track cycle details to view period, ovulation, and fertile highlights.</p>
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
