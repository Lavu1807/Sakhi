import { useState } from "react";
import { Link } from "react-router-dom";

const initialSymptoms = {
  cramps: false,
  headache: false,
  fatigue: false,
  moodSwings: false,
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

    const selectedLabels = [];
    if (symptoms.cramps) selectedLabels.push("Cramps");
    if (symptoms.headache) selectedLabels.push("Headache");
    if (symptoms.fatigue) selectedLabels.push("Fatigue");
    if (symptoms.moodSwings) selectedLabels.push("Mood Swings");

    setResult({
      selectedLabels,
      possibleCauses,
      basicSuggestions,
    });
  }

  return (
    <main className="page-shell">
      <section className="page-card symptoms-card">
        <h2>Symptoms Checker</h2>

        <form onSubmit={handleSubmit} className="form-layout">
          <div className="checkbox-list">
            <label className="checkbox-item" htmlFor="symptom-cramps">
              <input
                id="symptom-cramps"
                type="checkbox"
                name="cramps"
                checked={symptoms.cramps}
                onChange={handleCheckboxChange}
              />
              Cramps
            </label>

            <label className="checkbox-item" htmlFor="symptom-headache">
              <input
                id="symptom-headache"
                type="checkbox"
                name="headache"
                checked={symptoms.headache}
                onChange={handleCheckboxChange}
              />
              Headache
            </label>

            <label className="checkbox-item" htmlFor="symptom-fatigue">
              <input
                id="symptom-fatigue"
                type="checkbox"
                name="fatigue"
                checked={symptoms.fatigue}
                onChange={handleCheckboxChange}
              />
              Fatigue
            </label>

            <label className="checkbox-item" htmlFor="symptom-mood-swings">
              <input
                id="symptom-mood-swings"
                type="checkbox"
                name="moodSwings"
                checked={symptoms.moodSwings}
                onChange={handleCheckboxChange}
              />
              Mood Swings
            </label>
          </div>

          <button type="submit" className="btn-primary btn-block">
            Check Symptoms
          </button>
        </form>

        <p className="disclaimer-text">This is not a medical diagnosis.</p>

        {result && (
          <section className="result-card">
            <h3>Selected Symptoms</h3>
            <p>{result.selectedLabels.length ? result.selectedLabels.join(", ") : "--"}</p>

            <h3 className="sub-section-title">Possible General Causes</h3>
            <ul className="nutrition-list">
              {result.possibleCauses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h3 className="sub-section-title">Basic Suggestions</h3>
            <ul className="nutrition-list">
              {result.basicSuggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        <p className="link-row">
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </section>
    </main>
  );
}
