import { Link } from "react-router-dom";

const mythsAndFacts = [
  {
    myth: "You can't exercise during periods.",
    fact: "Light exercise can help reduce cramps and improve mood.",
  },
  {
    myth: "A period cycle is always exactly 28 days.",
    fact: "Cycle length can vary, and many people have cycles between 21 and 35 days.",
  },
  {
    myth: "Period blood is dirty blood.",
    fact: "It is a natural shedding of the uterine lining and is a normal body process.",
  },
  {
    myth: "Severe period pain is always normal.",
    fact: "Mild discomfort is common, but severe pain should be discussed with a healthcare professional.",
  },
  {
    myth: "You cannot get pregnant during your period.",
    fact: "Pregnancy is still possible, especially with shorter cycles and sperm survival over several days.",
  },
  {
    myth: "Mood changes are just overreacting.",
    fact: "Hormonal shifts can cause real emotional and physical symptoms.",
  },
];

export default function Education() {
  return (
    <main className="page-shell">
      <section className="page-card">
        <h2>Myths vs Facts</h2>
        <p className="education-intro">
          Learn the facts, challenge stigma, and support healthy conversations around menstrual health.
        </p>

        <div className="myth-fact-grid">
          {mythsAndFacts.map((item) => (
            <article className="myth-fact-card" key={item.myth}>
              <p className="myth-label">Myth: {item.myth}</p>
              <p className="fact-label">Fact: {item.fact}</p>
            </article>
          ))}
        </div>

        <p className="link-row">
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </section>
    </main>
  );
}
