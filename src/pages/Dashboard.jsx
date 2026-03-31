import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDisplayDate, formatOvulationWindow, readCycleData } from "../utils/cycleUtils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [cycleData, setCycleData] = useState(readCycleData());

  useEffect(() => {
    setCycleData(readCycleData());
  }, []);

  return (
    <main className="page-shell">
      <section className="page-card">
        <h2>Welcome to SAKHI</h2>
        <p className="section-intro">Your personalized cycle snapshot for today.</p>

        <div className="dashboard-grid">
          <section className="info-card">
            <div className="metric-heading">
              <span className="metric-icon" aria-hidden="true">
                🌙
              </span>
              <h3>Current Cycle Phase</h3>
            </div>
            <p className="metric-value">{cycleData.currentPhase || "No data yet"}</p>
          </section>

          <section className="info-card">
            <div className="metric-heading">
              <span className="metric-icon" aria-hidden="true">
                💧
              </span>
              <h3>Last Period Date</h3>
            </div>
            <p className="metric-value">{formatDisplayDate(cycleData.lastDate)}</p>
          </section>

          <section className="info-card">
            <div className="metric-heading">
              <span className="metric-icon" aria-hidden="true">
                🔁
              </span>
              <h3>Cycle Length</h3>
            </div>
            <p className="metric-value">
              {cycleData.cycleLength ? `${cycleData.cycleLength} days` : "--"}
            </p>
          </section>

          <section className="info-card">
            <div className="metric-heading">
              <span className="metric-icon" aria-hidden="true">
                📅
              </span>
              <h3>Next Period Date</h3>
            </div>
            <p className="metric-value">{formatDisplayDate(cycleData.nextPeriod)}</p>
          </section>

          <section className="info-card">
            <div className="metric-heading">
              <span className="metric-icon" aria-hidden="true">
                🌸
              </span>
              <h3>Ovulation Window</h3>
            </div>
            <p className="metric-value">{formatOvulationWindow(cycleData.ovulationDate)}</p>
          </section>
        </div>

        <div className="button-row">
          <button type="button" className="btn-primary" onClick={() => navigate("/cycle")}>
            Track Cycle
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate("/nutrition")}>
            Nutrition
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate("/chatbot")}>
            Chatbot
          </button>
        </div>

        <p className="link-row">
          <Link to="/">Go to Login</Link> | <Link to="/signup">Go to Signup</Link>
        </p>
      </section>
    </main>
  );
}
