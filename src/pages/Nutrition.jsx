import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";
import { readCycleData } from "../utils/cycleUtils";

const PHASE_NUTRITION_MAP = {
  "Menstrual Phase": {
    focusTitle: "Iron-Rich Recovery",
    suggestions: [
      {
        category: "Leafy Greens",
        icon: "🥬",
        description: "Spinach and leafy greens to support iron levels.",
      },
      {
        category: "Plant Protein",
        icon: "🫘",
        description: "Lentils, chickpeas, and beans for steady energy.",
      },
      {
        category: "Natural Iron Boost",
        icon: "🍇",
        description: "Dates and raisins for gentle mineral replenishment.",
      },
      {
        category: "Absorption Support",
        icon: "🍋",
        description: "Beetroot with lemon-rich foods to improve iron uptake.",
      },
    ],
  },
  "Follicular Phase": {
    focusTitle: "Protein + Fiber Balance",
    suggestions: [
      {
        category: "Lean Protein",
        icon: "🍳",
        description: "Eggs, paneer, tofu, or other lean proteins.",
      },
      {
        category: "Whole Grains",
        icon: "🌾",
        description: "Oats, whole grains, and seeds for sustained fuel.",
      },
      {
        category: "Fresh Produce",
        icon: "🥕",
        description: "Fruits and crunchy vegetables for micronutrients.",
      },
      {
        category: "Smart Salads",
        icon: "🥗",
        description: "Sprouts and mixed lentil salads for light nourishment.",
      },
    ],
  },
  "Ovulation Phase": {
    focusTitle: "Light + Fresh Foods",
    suggestions: [
      {
        category: "Hydrating Fruits",
        icon: "🍉",
        description: "Water-rich fruits like watermelon and oranges.",
      },
      {
        category: "Cooling Meals",
        icon: "🥒",
        description: "Cucumber, lettuce, and light soups.",
      },
      {
        category: "Balanced Bowls",
        icon: "🥣",
        description: "Yogurt bowls with fruits and nuts.",
      },
      {
        category: "Simple Proteins",
        icon: "🍲",
        description: "Steamed vegetables with easy-to-digest proteins.",
      },
    ],
  },
  "Luteal Phase": {
    focusTitle: "Complex Carbs + Magnesium",
    suggestions: [
      {
        category: "Comfort Carbs",
        icon: "🍠",
        description: "Brown rice, sweet potato, and whole grains.",
      },
      {
        category: "Mineral Rich",
        icon: "🍌",
        description: "Bananas and dark leafy greens.",
      },
      {
        category: "Mood-Support Snacks",
        icon: "🍫",
        description: "Nuts, seeds, and dark chocolate in moderation.",
      },
      {
        category: "Seed + Legume Mix",
        icon: "🎃",
        description: "Pumpkin seeds and legumes for magnesium support.",
      },
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
        focusTitle: "No data yet",
        suggestions: [
          {
            category: "Start Tracking",
            icon: "🗓️",
            description: "Track your cycle first to get personalized nutrition suggestions.",
          },
        ],
      };
    }

    return PHASE_NUTRITION_MAP[currentPhase];
  }, [currentPhase]);

  return (
    <PageFrame>
      <motion.section className="page-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={staggerItem}>
          Food and Hormone Sync
        </motion.p>

        <motion.h2 className="heading-with-icon" variants={staggerItem}>
          <span className="heading-icon" aria-hidden="true">
            🥗
          </span>
          Nutrition Guidance
        </motion.h2>

        <motion.div className="dashboard-grid" variants={staggerParent}>
          <motion.section className="info-card spotlight-card" variants={staggerItem}>
            <h3>Current Phase</h3>
            <p className="metric-value">{currentPhase || "No data yet"}</p>
          </motion.section>

          <motion.section className="info-card spotlight-card" variants={staggerItem}>
            <h3>Nutrition Focus</h3>
            <p className="metric-value">{nutritionPlan.focusTitle}</p>
          </motion.section>
        </motion.div>

        <motion.h3 className="nutrition-phase-heading" variants={staggerItem}>
          Nutrition for your current phase
        </motion.h3>

        <motion.div className="nutrition-suggestion-grid" variants={staggerParent}>
          {nutritionPlan.suggestions.map((item) => (
            <motion.article key={item.category} className="nutrition-suggestion-card" variants={staggerItem}>
              <div className="nutrition-suggestion-head">
                <span className="nutrition-suggestion-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <p className="nutrition-suggestion-title">{item.category}</p>
              </div>
              <p className="nutrition-suggestion-text">{item.description}</p>
            </motion.article>
          ))}
        </motion.div>

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link> | <Link to="/cycle">Update Cycle Data</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


