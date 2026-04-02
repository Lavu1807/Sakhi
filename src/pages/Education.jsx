import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";

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
    <PageFrame>
      <motion.section className="page-card" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={staggerItem}>
          Bust The Stigma
        </motion.p>

        <motion.h2 className="heading-with-icon" variants={staggerItem}>
          <span className="heading-icon" aria-hidden="true">
            📘
          </span>
          Myths vs Facts
        </motion.h2>

        <motion.p className="education-intro" variants={staggerItem}>
          Learn the facts, challenge stigma, and support healthy conversations around menstrual health.
        </motion.p>

        <motion.div className="myth-fact-grid" variants={staggerParent}>
          {mythsAndFacts.map((item) => (
            <motion.article className="myth-fact-card" key={item.myth} variants={staggerItem}>
              <section className="myth-block">
                <p className="myth-fact-kicker">
                  <span className="myth-fact-icon" aria-hidden="true">
                    ⚠️
                  </span>
                  Myth
                </p>
                <p className="myth-label">{item.myth}</p>
              </section>

              <section className="fact-block">
                <p className="myth-fact-kicker fact">
                  <span className="myth-fact-icon" aria-hidden="true">
                    💡
                  </span>
                  Fact
                </p>
                <p className="fact-label">{item.fact}</p>
              </section>
            </motion.article>
          ))}
        </motion.div>

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


