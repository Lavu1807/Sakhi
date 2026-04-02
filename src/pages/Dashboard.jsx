import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import CycleCalendar from "../components/CycleCalendar";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";
import { formatDisplayDate, formatOvulationWindow, readCycleData } from "../utils/cycleUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [cycleData, setCycleData] = useState(readCycleData());

  useEffect(() => {
    setCycleData(readCycleData());
  }, []);

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
    ],
    [cycleData],
  );

  return (
    <PageFrame>
      <section className="page-card dashboard-card dashboard-page">
        <motion.div
          className="dashboard-greeting"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.46, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="dashboard-greeting-line">Hello, User 💜</p>
          <h2>Welcome back to SAKHI</h2>
          <p className="section-intro dashboard-intro">Your cycle essentials, neatly organized for today.</p>
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

        <motion.div
          className="dashboard-calendar-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          <CycleCalendar lastPeriodDate={cycleData.lastDate} cycleLength={cycleData.cycleLength} />
        </motion.div>

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
        </motion.div>

        <p className="link-row dashboard-link-row">
          <Link to="/cycle">Update cycle details</Link>
        </p>
      </section>
    </PageFrame>
  );
}


