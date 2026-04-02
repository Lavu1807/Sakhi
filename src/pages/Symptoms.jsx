import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";

const initialSymptoms = {
  cramps: false,
  headache: false,
  fatigue: false,
  moodSwings: false,
};

const SYMPTOM_GROUPS = [
  {
    title: "Physical Symptoms",
    items: [
      { key: "cramps", label: "Cramps" },
      { key: "headache", label: "Headache" },
      { key: "fatigue", label: "Fatigue" },
    ],
  },
  {
    title: "Emotional Symptoms",
    items: [{ key: "moodSwings", label: "Mood Swings" }],
  },
];

const SYMPTOM_LABELS = {
  cramps: "Cramps",
  headache: "Headache",
  fatigue: "Fatigue",
  moodSwings: "Mood Swings",
};

export default function Symptoms() {
  const [symptoms, setSymptoms] = useState(initialSymptoms);
  const [result, setResult] = useState(null);

  function handleCheckboxChange(event) {
    const { name, checked } = event.target;
    setSymptoms((prev) => ({ ...prev, [name]: checked }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const selectedSymptoms = Object.keys(symptoms).filter((key) => symptoms[key]);
    const possibleCauses = [];
    const basicSuggestions = [];

    if (selectedSymptoms.length === 0) {
      possibleCauses.push("No symptoms selected yet.");
      basicSuggestions.push("Select one or more symptoms and submit to get guidance.");
    } else {
      if (symptoms.cramps) {
        possibleCauses.push("Cramps can occur due to uterine muscle contractions during menstruation.");
      }

      if (symptoms.headache) {
        possibleCauses.push("Headache may be linked to hormone changes, stress, or dehydration.");
      }

      if (symptoms.fatigue) {
        possibleCauses.push("Fatigue can happen due to low energy, poor sleep, or blood loss during periods.");
      }

      if (symptoms.moodSwings) {
        possibleCauses.push("Mood swings may happen because of hormonal shifts and emotional stress.");
      }

      basicSuggestions.push("Take enough rest and avoid overexertion.");
      basicSuggestions.push("Stay hydrated throughout the day.");

      if (symptoms.cramps || symptoms.headache) {
        basicSuggestions.push("Try a warm compress and gentle stretching.");
      }

      if (symptoms.fatigue) {
        basicSuggestions.push("Eat balanced meals with iron-rich foods.");
      }

      if (symptoms.moodSwings) {
        basicSuggestions.push("Practice deep breathing or talk to someone you trust.");
      }
    }

    const selectedLabels = selectedSymptoms.map((key) => SYMPTOM_LABELS[key]);

    setResult({
      selectedLabels,
      possibleCauses,
      basicSuggestions,
    });
  }

  return (
    <PageFrame>
      <motion.section className="page-card symptoms-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={staggerItem}>
          Understand What You Feel
        </motion.p>

        <motion.h2 className="heading-with-icon" variants={staggerItem}>
          <span className="heading-icon" aria-hidden="true">
            🩺
          </span>
          Symptoms Checker
        </motion.h2>

        <motion.p className="section-intro symptoms-intro" variants={staggerItem}>
          Select what you are experiencing so we can organize gentle self-care guidance.
        </motion.p>

        <motion.form onSubmit={handleSubmit} className="form-layout" variants={staggerParent}>
          <motion.div className="symptom-groups" variants={staggerParent}>
            {SYMPTOM_GROUPS.map((group) => (
              <motion.section key={group.title} className="symptom-group-card" variants={staggerItem}>
                <h3 className="symptom-group-title">{group.title}</h3>
                <div className="checkbox-list symptom-checkbox-list">
                  {group.items.map((item) => {
                    const inputId = `symptom-${item.key}`;

                    return (
                      <label key={item.key} className="checkbox-item" htmlFor={inputId}>
                        <input
                          id={inputId}
                          type="checkbox"
                          name={item.key}
                          checked={symptoms[item.key]}
                          onChange={handleCheckboxChange}
                        />
                        {item.label}
                      </label>
                    );
                  })}
                </div>
              </motion.section>
            ))}
          </motion.div>

          <motion.button type="submit" className="btn-primary btn-block" variants={staggerItem}>
            Check Symptoms
          </motion.button>
        </motion.form>

        <motion.p className="disclaimer-text symptoms-disclaimer" variants={staggerItem}>
          For awareness only. This checker does not replace medical advice.
        </motion.p>

        {result && (
          <motion.section
            className="result-card symptoms-result-box"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <h3>Selected Symptoms</h3>
            <div className="symptom-tags-row">
              {result.selectedLabels.length ? (
                result.selectedLabels.map((label) => (
                  <span key={label} className="symptom-tag">
                    {label}
                  </span>
                ))
              ) : (
                <p className="symptom-empty-state">No symptoms selected.</p>
              )}
            </div>

            <div className="symptom-result-grid">
              <section className="symptom-result-panel">
                <h3 className="sub-section-title">Possible General Causes</h3>
                <ul className="nutrition-list symptom-result-list">
                  {result.possibleCauses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>

              <section className="symptom-result-panel">
                <h3 className="sub-section-title">Basic Suggestions</h3>
                <ul className="nutrition-list symptom-result-list">
                  {result.basicSuggestions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            </div>
          </motion.section>
        )}

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


