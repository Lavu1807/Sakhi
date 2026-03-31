import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { readCycleData } from "../utils/cycleUtils";

const PHASE_NUTRITION_MAP = {
  "Menstrual Phase": {
    title: "Iron-Rich Foods",
    items: [
      "Spinach and leafy greens",
      "Lentils, chickpeas, and beans",
      "Dates and raisins",
      "Beetroot with lemon-rich foods",
    ],
  },
  "Follicular Phase": {
    title: "Protein + Fiber",
    items: [
      "Eggs, paneer, tofu, or lean proteins",
      "Oats, whole grains, and seeds",
      "Fresh fruits and crunchy vegetables",
      "Sprouts and mixed lentil salads",
    ],
  },
  "Ovulation Phase": {
    title: "Light + Fresh Foods",
    items: [
      "Water-rich fruits like watermelon and oranges",
      "Cucumber, lettuce, and light soups",
      "Yogurt bowls with fruits and nuts",
      "Steamed vegetables with simple proteins",
    ],
  },
  "Luteal Phase": {
    title: "Complex Carbs + Magnesium",
    items: [
      "Brown rice, sweet potato, and whole grains",
      "Bananas and dark leafy greens",
      "Nuts, seeds, and dark chocolate in moderation",
      "Pumpkin seeds and legumes",
    ],
  },
};

export default function Nutrition() {
  const [currentPhase, setCurrentPhase] = useState("");

  useEffect(() => {
    const cycleData = readCycleData();
    setCurrentPhase(cycleData.currentPhase);
  }, []);

  const nutritionPlan = useMemo(() => {
    if (!currentPhase || !PHASE_NUTRITION_MAP[currentPhase]) {
      return {
        title: "No data yet",
        items: ["Track your cycle first to get personalized nutrition suggestions."],
      };
    }

    return PHASE_NUTRITION_MAP[currentPhase];
  }, [currentPhase]);

  return (
    <main className="page-shell">
      <section className="page-card">
        <h2>Nutrition Guidance</h2>

        <div className="dashboard-grid">
          <section className="info-card">
            <h3>Current Phase</h3>
            <p>{currentPhase || "No data yet"}</p>
          </section>

          <section className="info-card">
            <h3>Nutrition Focus</h3>
            <p>{nutritionPlan.title}</p>
          </section>
        </div>

        <section className="result-card">
          <h3>Suggested Foods</h3>
          <ul className="nutrition-list">
            {nutritionPlan.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <p className="link-row">
          <Link to="/dashboard">Back to Dashboard</Link> | <Link to="/cycle">Update Cycle Data</Link>
        </p>
      </section>
    </main>
  );
}
