import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";
import { readCycleData } from "../utils/cycleUtils";
import { getAuthToken, getAuthUser } from "../utils/auth";
import { getFoodNutrition } from "../utils/api";
import { getSmartNutrition, getSymptomOptionsForPhase } from "../utils/nutritionEngine";

const SUGGESTION_ICONS = ["🥗", "🥣", "🍲", "🥕", "🍠", "🥬"];
const NUTRITION_UNAVAILABLE_MESSAGE = "Nutrition data unavailable";

const formatLabel = (value) =>
  String(value)
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const formatMetricValue = (value) => (Number.isFinite(value) ? Number(value).toFixed(1).replace(/\.0$/, "") : "--");

const mapNutritionMetrics = (nutritionEntry) => {
  if (!nutritionEntry) {
    return [];
  }

  return [
    { label: "Calories", value: nutritionEntry.calories, unit: "kcal" },
    { label: "Protein", value: nutritionEntry.protein, unit: "g" },
    { label: "Carbs", value: nutritionEntry.carbs, unit: "g" },
    { label: "Fat", value: nutritionEntry.fat, unit: "g" },
  ];
};

export default function Nutrition() {
  const [currentPhase, setCurrentPhase] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [authToken, setAuthToken] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [foodNutritionData, setFoodNutritionData] = useState({});
  const [nutritionDataLoading, setNutritionDataLoading] = useState(false);
  const [nutritionDataMessage, setNutritionDataMessage] = useState("");

  useEffect(() => {
    const cycleData = readCycleData();
    setCurrentPhase(cycleData.currentPhase);
    setUserProfile(getAuthUser());
    setAuthToken(getAuthToken());
  }, []);

  const symptomOptions = useMemo(() => getSymptomOptionsForPhase(currentPhase), [currentPhase]);

  useEffect(() => {
    const availableSymptoms = new Set(symptomOptions.map((item) => item.key));
    setSelectedSymptoms((prev) => prev.filter((symptom) => availableSymptoms.has(symptom)));
  }, [symptomOptions]);

  function handleSymptomToggle(symptomKey) {
    setSelectedSymptoms((prev) =>
      prev.includes(symptomKey) ? prev.filter((item) => item !== symptomKey) : [...prev, symptomKey],
    );
  }

  const nutritionPlan = useMemo(() => {
    const { finalFoods, nutrients, foodGroups, explanation } = getSmartNutrition(
      currentPhase,
      selectedSymptoms,
      userProfile || {},
    );

    if (!currentPhase || finalFoods.length === 0) {
      return {
        focusTitle: "No data yet",
        explanation: "Track your cycle first to get personalized nutrition suggestions.",
        nutrients: [],
        foodGroups: [],
        finalFoods: [],
      };
    }

    return {
      focusTitle: nutrients.length ? nutrients.slice(0, 3).map(formatLabel).join(" + ") : "Balanced Nutrition",
      explanation,
      nutrients,
      foodGroups,
      finalFoods,
    };
  }, [currentPhase, selectedSymptoms, userProfile]);

  useEffect(() => {
    let isActive = true;

    async function loadExternalNutrition() {
      if (!nutritionPlan.finalFoods.length) {
        setNutritionDataLoading(false);
        setNutritionDataMessage("");
        return;
      }

      const missingFoods = nutritionPlan.finalFoods.filter((food) => foodNutritionData[food] === undefined);

      if (!missingFoods.length) {
        setNutritionDataLoading(false);
        setNutritionDataMessage("");
        return;
      }

      setNutritionDataLoading(true);
      setNutritionDataMessage("");

      try {
        // USDA enrichment is display-only. Recommendation logic stays in getSmartNutrition.
        const settledResults = await Promise.allSettled(
          missingFoods.map((food) => getFoodNutrition(food, authToken)),
        );

        if (!isActive) {
          return;
        }

        let failedCount = 0;
        setFoodNutritionData((prev) => {
          const next = { ...prev };

          settledResults.forEach((result, index) => {
            const food = missingFoods[index];

            if (result.status === "fulfilled") {
              next[food] = result.value;
              return;
            }

            next[food] = null;
            failedCount += 1;
          });

          return next;
        });

        if (failedCount > 0) {
          setNutritionDataMessage(NUTRITION_UNAVAILABLE_MESSAGE);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setNutritionDataMessage(error.message || NUTRITION_UNAVAILABLE_MESSAGE);
      } finally {
        if (isActive) {
          setNutritionDataLoading(false);
        }
      }
    }

    loadExternalNutrition();

    return () => {
      isActive = false;
    };
  }, [authToken, foodNutritionData, nutritionPlan.finalFoods]);

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

          <motion.section className="info-card spotlight-card" variants={staggerItem}>
            <h3>Selected Symptoms</h3>
            <p className="metric-value">{selectedSymptoms.length ? `${selectedSymptoms.length} selected` : "None selected"}</p>
            <div className="symptom-tags-row nutrition-inline-tags">
              {selectedSymptoms.length ? (
                selectedSymptoms.map((symptom) => (
                  <span key={symptom} className="symptom-tag">
                    {formatLabel(symptom)}
                  </span>
                ))
              ) : (
                <p className="symptom-empty-state">Pick symptoms below to refine results.</p>
              )}
            </div>
          </motion.section>
        </motion.div>

        <motion.section className="symptom-group-card nutrition-input-card" variants={staggerItem}>
          <h3 className="symptom-group-title">Tell us what you feel today</h3>
          <p className="summary-text">Choose symptoms to tailor your nutrition recommendations.</p>

          {symptomOptions.length ? (
            <div className="checkbox-list symptom-checkbox-list nutrition-symptom-list">
              {symptomOptions.map((item) => {
                const inputId = `nutrition-symptom-${item.key}`;

                return (
                  <label key={item.key} className="checkbox-item" htmlFor={inputId}>
                    <input
                      id={inputId}
                      type="checkbox"
                      checked={selectedSymptoms.includes(item.key)}
                      onChange={() => handleSymptomToggle(item.key)}
                    />
                    {item.label}
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="symptom-empty-state">No symptom options available until phase data is available.</p>
          )}
        </motion.section>

        <motion.h3 className="nutrition-phase-heading" variants={staggerItem}>
          Nutrition for your current phase
        </motion.h3>

        <motion.section className="result-card symptoms-result-box nutrition-dashboard-card" variants={staggerItem}>
          <h3>Why these recommendations?</h3>
          <p className="summary-text nutrition-explanation">{nutritionPlan.explanation}</p>
          {nutritionDataLoading && (
            <p className="nutrition-api-status nutrition-api-loading" role="status" aria-live="polite">
              <span className="nutrition-spinner" aria-hidden="true" />
              Fetching calories, protein, carbs, and fat from USDA...
            </p>
          )}
          {!!nutritionDataMessage && <p className="nutrition-api-status nutrition-api-warning">{nutritionDataMessage}</p>}
        </motion.section>

        <motion.section className="result-card symptoms-result-box nutrition-dashboard-card" variants={staggerItem}>
          <h3>Key Nutrients</h3>
          <div className="symptom-tags-row">
            {nutritionPlan.nutrients.length ? (
              nutritionPlan.nutrients.map((nutrient) => (
                <span key={nutrient} className="symptom-tag nutrient-tag">
                  {formatLabel(nutrient)}
                </span>
              ))
            ) : (
              <p className="symptom-empty-state">No nutrient insights available yet.</p>
            )}
          </div>
        </motion.section>

        <motion.div className="nutrition-category-grid" variants={staggerParent}>
          {nutritionPlan.foodGroups.length ? (
            nutritionPlan.foodGroups.map((group, index) => (
              <motion.section key={group.category} className="symptom-result-panel nutrition-category-panel" variants={staggerItem}>
                <h3 className="sub-section-title nutrition-category-title">
                  <span className="nutrition-suggestion-icon" aria-hidden="true">
                    {SUGGESTION_ICONS[index % SUGGESTION_ICONS.length]}
                  </span>
                  {group.category}
                </h3>

                <ul className="nutrition-list nutrition-category-list">
                  {group.items.map((item) => {
                    const nutritionEntry = foodNutritionData[item.food];
                    const metrics = mapNutritionMetrics(nutritionEntry);
                    const showCardLoading = nutritionDataLoading && nutritionEntry === undefined;

                    return (
                      <li key={`${group.category}-${item.food}`} className="nutrition-food-card">
                        <div className="nutrition-food-head">
                          <span className="nutrition-food-name">{formatLabel(item.food)}</span>
                          {showCardLoading && (
                            <span className="nutrition-card-loader" role="status" aria-live="polite">
                              <span className="nutrition-spinner" aria-hidden="true" />
                              Loading nutrition
                            </span>
                          )}
                        </div>

                        <p className="nutrition-food-reason">{item.reason}</p>

                        {metrics.length ? (
                          <div className="nutrition-metrics-card-grid">
                            {metrics.map((metric) => (
                              <article key={`${item.food}-${metric.label}`} className="nutrition-metric-card">
                                <p className="nutrition-metric-card-label">{metric.label}</p>
                                <p className="nutrition-metric-card-value">
                                  {formatMetricValue(metric.value)} <span>{metric.unit}</span>
                                </p>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="nutrition-unavailable">
                            {showCardLoading
                              ? "USDA nutrition data is loading for this food."
                              : NUTRITION_UNAVAILABLE_MESSAGE}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </motion.section>
            ))
          ) : (
            <motion.section className="symptom-result-panel nutrition-category-panel" variants={staggerItem}>
              <h3 className="sub-section-title">No suggestions yet</h3>
              <p className="symptom-empty-state">Add cycle and symptom data to view smart nutrition recommendations.</p>
            </motion.section>
          )}
        </motion.div>

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link> | <Link to="/cycle">Update Cycle Data</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


