import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";
import { getMyths, sendMythFeedback } from "../utils/api";
import { readCycleData } from "../utils/cycleUtils";
import { getSymptomChatContext } from "../utils/symptomContext";

const MYTH_CATEGORIES = ["All", "Menstruation", "Nutrition", "Hygiene", "Exercise", "Mental Health"];
const QUIZ_MODES = {
  CARDS: "cards",
  QUIZ: "quiz",
};
const MYTH_FEEDBACK_STORAGE_KEY = "sakhi_myth_feedback";

function readSavedFeedback() {
  try {
    const raw = localStorage.getItem(MYTH_FEEDBACK_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveFeedbackState(nextFeedback) {
  try {
    localStorage.setItem(MYTH_FEEDBACK_STORAGE_KEY, JSON.stringify(nextFeedback));
  } catch {
    // Keep interaction responsive even if storage is unavailable.
  }
}

function formatSourceLabel(source) {
  const normalizedSource = String(source || "").trim();
  return normalizedSource ? `Source: ${normalizedSource}` : "Source: Research article";
}

function normalizeSymptomsList(symptoms) {
  if (!Array.isArray(symptoms)) {
    return [];
  }

  return Array.from(
    new Set(
      symptoms
        .map((item) => String(item || "").trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function resolvePersonalizationContext() {
  const symptomContext = getSymptomChatContext();
  const cycleData = readCycleData();

  const symptoms = normalizeSymptomsList(symptomContext?.symptoms);
  const phase = String(symptomContext?.phase || cycleData?.currentPhase || "").trim();

  return {
    symptoms,
    phase,
  };
}

function getRandomQuizQuestion(items, previousKey = "") {
  if (!Array.isArray(items) || !items.length) {
    return null;
  }

  const maxAttempts = Math.max(8, items.length * 2);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const randomItem = items[Math.floor(Math.random() * items.length)];
    const asksMyth = Math.random() < 0.5;
    const correctAnswer = asksMyth ? "Myth" : "Fact";
    const questionKey = `${randomItem.id}-${correctAnswer}`;

    if (items.length > 1 && questionKey === previousKey) {
      continue;
    }

    return {
      key: questionKey,
      statement: asksMyth ? randomItem.myth : randomItem.fact,
      correctAnswer,
      explanation: asksMyth
        ? `This statement is a myth. The accurate fact is: ${randomItem.fact}`
        : `This statement is a fact. A common related myth is: ${randomItem.myth}`,
      source: formatSourceLabel(randomItem.source),
    };
  }

  const fallbackItem = items[0];
  return {
    key: `${fallbackItem.id}-Myth`,
    statement: fallbackItem.myth,
    correctAnswer: "Myth",
    explanation: `This statement is a myth. The accurate fact is: ${fallbackItem.fact}`,
    source: formatSourceLabel(fallbackItem.source),
  };
}

export default function Education() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [myths, setMyths] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [flippedCards, setFlippedCards] = useState({});
  const [mode, setMode] = useState(QUIZ_MODES.CARDS);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedbackState, setFeedbackState] = useState(() => readSavedFeedback());
  const [feedbackAck, setFeedbackAck] = useState({});
  const [quizScore, setQuizScore] = useState({
    correct: 0,
    total: 0,
  });
  const personalizationContext = useMemo(() => resolvePersonalizationContext(), []);
  const personalizationHint = useMemo(() => {
    const labels = [];

    if (personalizationContext.symptoms.length > 0) {
      labels.push(`symptoms: ${personalizationContext.symptoms.join(", ")}`);
    }

    if (personalizationContext.phase) {
      labels.push(`phase: ${personalizationContext.phase}`);
    }

    return labels.join(" • ");
  }, [personalizationContext]);

  const loadMyths = useCallback(async (category, context) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getMyths(category, context);
      const nextMyths = Array.isArray(response.myths) ? response.myths : [];
      setMyths(nextMyths);
      setFlippedCards({});
      setQuizQuestion(getRandomQuizQuestion(nextMyths));
      setQuizAnswered(false);
      setSelectedAnswer("");
      setQuizScore({ correct: 0, total: 0 });
    } catch (error) {
      setMyths([]);
      setQuizQuestion(null);
      setQuizAnswered(false);
      setSelectedAnswer("");
      setQuizScore({ correct: 0, total: 0 });
      setErrorMessage(error.message || "Failed to load myths.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMyths(activeCategory, personalizationContext);
  }, [activeCategory, loadMyths, personalizationContext]);

  const filteredMyths = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return myths;
    }

    return myths.filter((item) => {
      const mythText = String(item.myth || "").toLowerCase();
      const categoryText = String(item.category || "").toLowerCase();
      return mythText.includes(query) || categoryText.includes(query);
    });
  }, [myths, searchQuery]);

  useEffect(() => {
    if (isLoading || errorMessage || mode !== QUIZ_MODES.QUIZ) {
      return;
    }

    setQuizQuestion((previousQuestion) => getRandomQuizQuestion(filteredMyths, previousQuestion?.key || ""));
    setQuizAnswered(false);
    setSelectedAnswer("");
  }, [filteredMyths, isLoading, errorMessage, mode]);

  const toggleCardFlip = (cardId) => {
    setFlippedCards((previous) => ({
      ...previous,
      [cardId]: !previous[cardId],
    }));
  };

  const submitQuizAnswer = (answer) => {
    if (!quizQuestion || quizAnswered) {
      return;
    }

    const isCorrect = answer === quizQuestion.correctAnswer;
    setSelectedAnswer(answer);
    setQuizAnswered(true);
    setQuizScore((previous) => ({
      correct: previous.correct + (isCorrect ? 1 : 0),
      total: previous.total + 1,
    }));
  };

  const goToNextQuizQuestion = () => {
    setQuizQuestion((previousQuestion) => getRandomQuizQuestion(filteredMyths, previousQuestion?.key || ""));
    setQuizAnswered(false);
    setSelectedAnswer("");
  };

  const handleMythFeedback = async (mythId, feedbackType) => {
    const normalizedType = feedbackType === "believed" ? "believed" : "helpful";

    const nextFeedbackState = {
      ...feedbackState,
      [mythId]: {
        ...feedbackState[mythId],
        [normalizedType]: true,
      },
    };

    setFeedbackState(nextFeedbackState);
    saveFeedbackState(nextFeedbackState);

    setFeedbackAck((previous) => ({
      ...previous,
      [mythId]: normalizedType === "believed" ? "Thanks for sharing your experience." : "Thanks! Glad this helped.",
    }));

    try {
      await sendMythFeedback({
        mythId,
        feedbackType: normalizedType,
      });
    } catch {
      // Local storage still preserves feedback even if backend is unavailable.
    }
  };

  return (
    <PageFrame>
      <motion.section className="page-card myths-module" variants={staggerParent} initial="hidden" animate="show">
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

        <motion.div className="myth-category-tabs" variants={staggerItem} role="tablist" aria-label="Myth categories">
          {MYTH_CATEGORIES.map((category) => {
            const isActive = activeCategory === category;

            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`myth-category-tab${isActive ? " active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            );
          })}
        </motion.div>

        <motion.div className="myth-search-row" variants={staggerItem}>
          <label className="myth-search-label" htmlFor="myth-search-input">
            Search
          </label>
          <input
            id="myth-search-input"
            type="search"
            className="myth-search-input"
            placeholder="Search by myth text or category"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            autoComplete="off"
          />
        </motion.div>

        <motion.div className="myth-mode-switch" variants={staggerItem}>
          <button
            type="button"
            className={`myth-mode-btn${mode === QUIZ_MODES.CARDS ? " active" : ""}`}
            onClick={() => setMode(QUIZ_MODES.CARDS)}
          >
            Flip Cards
          </button>
          <button
            type="button"
            className={`myth-mode-btn${mode === QUIZ_MODES.QUIZ ? " active" : ""}`}
            onClick={() => setMode(QUIZ_MODES.QUIZ)}
          >
            Quiz Mode
          </button>
        </motion.div>

        {personalizationHint && (
          <motion.p className="myth-personalization-note" variants={staggerItem}>
            Personalized for {personalizationHint}
          </motion.p>
        )}

        {isLoading && (
          <motion.p className="myths-status" variants={staggerItem}>
            Loading myths...
          </motion.p>
        )}

        {!isLoading && errorMessage && (
          <motion.div className="myths-status myths-status-error" variants={staggerItem}>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="myths-retry-btn"
              onClick={() => loadMyths(activeCategory, personalizationContext)}
            >
              Retry
            </button>
          </motion.div>
        )}

        {!isLoading && !errorMessage && filteredMyths.length === 0 && (
          <motion.p className="myths-status" variants={staggerItem}>
            No myths found for this filter.
          </motion.p>
        )}

        {mode === QUIZ_MODES.CARDS && (
          <motion.div className="myth-fact-grid" variants={staggerParent}>
            {!isLoading && !errorMessage && filteredMyths.map((item) => {
              const isFlipped = Boolean(flippedCards[item.id]);

              return (
                <motion.article
                  className={`myth-fact-card${isFlipped ? " is-flipped" : ""}`}
                  key={item.id}
                  variants={staggerItem}
                >
                  <button
                    type="button"
                    className="myth-fact-flip-btn"
                    aria-pressed={isFlipped}
                    onClick={() => toggleCardFlip(item.id)}
                  >
                    <span className="myth-fact-flip-inner">
                      <section className="myth-fact-face myth-block">
                        <p className="myth-fact-kicker">❌ Myth</p>
                        <p className="myth-label">{item.myth}</p>
                      </section>

                      <section className="myth-fact-face fact-block">
                        <p className="myth-fact-kicker fact">✅ Fact</p>
                        <p className="fact-label">{item.fact}</p>
                        <p className="myth-source-note">{formatSourceLabel(item.source)}</p>

                        <div className="myth-feedback-actions">
                          <button
                            type="button"
                            className={`myth-feedback-btn${feedbackState[item.id]?.believed ? " selected" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMythFeedback(item.id, "believed");
                            }}
                            disabled={Boolean(feedbackState[item.id]?.believed)}
                          >
                            I believed this
                          </button>
                          <button
                            type="button"
                            className={`myth-feedback-btn${feedbackState[item.id]?.helpful ? " selected" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMythFeedback(item.id, "helpful");
                            }}
                            disabled={Boolean(feedbackState[item.id]?.helpful)}
                          >
                            Helpful
                          </button>
                        </div>

                        {feedbackAck[item.id] && <p className="myth-feedback-ack">{feedbackAck[item.id]}</p>}
                      </section>
                    </span>
                  </button>
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {mode === QUIZ_MODES.QUIZ && !isLoading && !errorMessage && (
          <motion.article className="myth-quiz-card" variants={staggerItem}>
            <p className="myth-quiz-score">
              Score: {quizScore.correct}/{quizScore.total}
            </p>

            {!quizQuestion && <p className="myths-status">No quiz items available for this category.</p>}

            {quizQuestion && (
              <>
                <p className="myth-quiz-question">Is this Myth or Fact?</p>
                <p className="myth-quiz-statement">{quizQuestion.statement}</p>

                <div className="myth-quiz-actions">
                  <button
                    type="button"
                    className={`myth-quiz-answer-btn${selectedAnswer === "Myth" ? " selected" : ""}`}
                    onClick={() => submitQuizAnswer("Myth")}
                    disabled={quizAnswered}
                  >
                    ❌ Myth
                  </button>
                  <button
                    type="button"
                    className={`myth-quiz-answer-btn${selectedAnswer === "Fact" ? " selected" : ""}`}
                    onClick={() => submitQuizAnswer("Fact")}
                    disabled={quizAnswered}
                  >
                    ✅ Fact
                  </button>
                </div>

                {quizAnswered && (
                  <div
                    className={`myth-quiz-feedback ${
                      selectedAnswer === quizQuestion.correctAnswer ? "correct" : "incorrect"
                    }`}
                  >
                    <p className="myth-quiz-result">
                      {selectedAnswer === quizQuestion.correctAnswer ? "Correct!" : "Not quite."}
                    </p>
                    <p className="myth-quiz-correct-answer">Correct answer: {quizQuestion.correctAnswer}</p>
                    <p className="myth-quiz-explanation">{quizQuestion.explanation}</p>
                    <p className="myth-quiz-source">{quizQuestion.source}</p>
                    <button type="button" className="myth-quiz-next-btn" onClick={goToNextQuizQuestion}>
                      Next Question
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.article>
        )}

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


