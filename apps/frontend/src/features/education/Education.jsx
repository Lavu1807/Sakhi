import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { getMyths, sendMythFeedback } from "../../shared/utils/api";
import { readCycleData } from "../cycle/cycleUtils";
import { getSymptomChatContext } from "../symptoms/symptomContext";

const MYTH_CATEGORIES = ["All", "Menstruation", "Nutrition", "Hygiene", "Exercise", "Mental Health"];
const VIEW_MODES = {
  CARDS: "cards",
  LIST: "list",
  QUIZ: "quiz",
};
const MYTH_FEEDBACK_STORAGE_KEY = "sakhi_myth_feedback";
const SEARCH_DEBOUNCE_MS = 300;

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
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [flippedCards, setFlippedCards] = useState({});
  const [expandedListItems, setExpandedListItems] = useState({});
  const [mode, setMode] = useState(VIEW_MODES.CARDS);
  const [quizQuestion, setQuizQuestion] = useState(null);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedbackState, setFeedbackState] = useState(() => readSavedFeedback());
  const [feedbackAck, setFeedbackAck] = useState({});
  const [quizScore, setQuizScore] = useState({
    correct: 0,
    total: 0,
  });
  const debounceTimerRef = useRef(null);
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

  // Debounce search input
  function handleSearchChange(event) {
    const value = event.target.value;
    setSearchQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const loadMyths = useCallback(async (category, context) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getMyths(category, context);
      const nextMyths = Array.isArray(response.myths) ? response.myths : [];
      setMyths(nextMyths);
      setFlippedCards({});
      setExpandedListItems({});
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
    const query = debouncedQuery.trim().toLowerCase();

    if (!query) {
      return myths;
    }

    return myths.filter((item) => {
      const mythText = String(item.myth || "").toLowerCase();
      const factText = String(item.fact || "").toLowerCase();
      const categoryText = String(item.category || "").toLowerCase();
      return mythText.includes(query) || factText.includes(query) || categoryText.includes(query);
    });
  }, [myths, debouncedQuery]);

  useEffect(() => {
    if (isLoading || errorMessage || mode !== VIEW_MODES.QUIZ) {
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

  const toggleListExpand = (itemId) => {
    setExpandedListItems((previous) => ({
      ...previous,
      [itemId]: !previous[itemId],
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

  function handleCardKeyDown(event, cardId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleCardFlip(cardId);
    }
  }

  return (
    <PageFrame>
      <motion.section className="page-card myths-module edu-page" variants={staggerParent} initial="hidden" animate="show">
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

        <motion.div className="edu-toolbar" variants={staggerItem}>
          <div className="edu-controls-row">
            <div className="edu-mode-switch" role="tablist" aria-label="View mode">
              <button
                type="button"
                className={`edu-mode-btn${mode === VIEW_MODES.CARDS ? " active" : ""}`}
                onClick={() => setMode(VIEW_MODES.CARDS)}
              >
                🃏 Flip Cards
              </button>
              <button
                type="button"
                className={`edu-mode-btn${mode === VIEW_MODES.LIST ? " active" : ""}`}
                onClick={() => setMode(VIEW_MODES.LIST)}
              >
                📋 List View
              </button>
              <button
                type="button"
                className={`edu-mode-btn${mode === VIEW_MODES.QUIZ ? " active" : ""}`}
                onClick={() => setMode(VIEW_MODES.QUIZ)}
              >
                🧠 Quiz Mode
              </button>
            </div>

            <div className="edu-search-row">
              <div className="edu-search-wrap">
                <span className="edu-search-icon" aria-hidden="true">🔍</span>
                <input
                  id="myth-search-input"
                  type="search"
                  className="edu-search-input"
                  placeholder="Search myths, facts, or categories..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="edu-category-tabs" role="tablist" aria-label="Myth categories">
            {MYTH_CATEGORIES.map((category) => {
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`edu-category-tab${isActive ? " active" : ""}`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </motion.div>

        {personalizationHint && (
          <motion.p className="edu-personalization-note" variants={staggerItem}>
            Personalized for {personalizationHint}
          </motion.p>
        )}

        {isLoading && (
          <motion.div className="edu-status" variants={staggerItem}>
            <div className="edu-loader" aria-hidden="true" />
            <p>Loading myths...</p>
          </motion.div>
        )}

        {!isLoading && errorMessage && (
          <motion.div className="edu-status edu-status-error" variants={staggerItem}>
            <p>{errorMessage}</p>
            <button
              type="button"
              className="edu-retry-btn"
              onClick={() => loadMyths(activeCategory, personalizationContext)}
            >
              Retry
            </button>
          </motion.div>
        )}

        {!isLoading && !errorMessage && filteredMyths.length === 0 && (
          <motion.p className="edu-status" variants={staggerItem}>
            No myths found for this filter.
          </motion.p>
        )}

        {/* ─── FLIP CARDS VIEW ─── */}
        {mode === VIEW_MODES.CARDS && (
          <motion.div className="edu-card-grid" variants={staggerParent}>
            {isLoading && Array.from({ length: 6 }).map((_, index) => (
              <div key={`edu-skeleton-${index}`} className="edu-card edu-card-skeleton" aria-hidden="true">
                <div className="edu-skeleton-line short" />
                <div className="edu-skeleton-line" />
                <div className="edu-skeleton-line" />
                <div className="edu-skeleton-line tiny" />
              </div>
            ))}

            {!isLoading && !errorMessage && filteredMyths.map((item) => {
              const isFlipped = Boolean(flippedCards[item.id]);

              return (
                <motion.article
                  className={`edu-card${isFlipped ? " is-flipped" : ""}`}
                  key={item.id}
                  variants={staggerItem}
                >
                  {/* Use div with role="button" instead of <button> to avoid nested button warning */}
                  <div
                    className="edu-card-flipper"
                    role="button"
                    tabIndex={0}
                    aria-pressed={isFlipped}
                    onClick={() => toggleCardFlip(item.id)}
                    onKeyDown={(event) => handleCardKeyDown(event, item.id)}
                  >
                    <div className="edu-card-flip-inner">
                      {/* Front: Myth */}
                      <section className="edu-card-face edu-card-myth">
                        <span className="edu-card-badge myth" aria-hidden="true">❌ Myth</span>
                        <p className="edu-card-title">{item.myth}</p>
                        <p className="edu-card-hint">Tap to reveal fact →</p>
                      </section>

                      {/* Back: Fact */}
                      <section className="edu-card-face edu-card-fact">
                        <span className="edu-card-badge fact" aria-hidden="true">✅ Fact</span>
                        <p className="edu-card-title">{item.fact}</p>
                        <p className="edu-card-source">{formatSourceLabel(item.source)}</p>
                      </section>
                    </div>
                  </div>

                  {/* Feedback buttons — OUTSIDE the flip trigger to avoid nesting */}
                  {isFlipped && (
                    <div className="edu-card-feedback">
                      <button
                        type="button"
                        className={`edu-feedback-btn${feedbackState[item.id]?.believed ? " selected" : ""}`}
                        onClick={() => handleMythFeedback(item.id, "believed")}
                        disabled={Boolean(feedbackState[item.id]?.believed)}
                      >
                        🤔 I believed this
                      </button>
                      <button
                        type="button"
                        className={`edu-feedback-btn${feedbackState[item.id]?.helpful ? " selected" : ""}`}
                        onClick={() => handleMythFeedback(item.id, "helpful")}
                        disabled={Boolean(feedbackState[item.id]?.helpful)}
                      >
                        👍 Helpful
                      </button>
                      {feedbackAck[item.id] && <p className="edu-feedback-ack">{feedbackAck[item.id]}</p>}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {/* ─── LIST VIEW ─── */}
        {mode === VIEW_MODES.LIST && !isLoading && !errorMessage && (
          <motion.div className="edu-list" variants={staggerParent}>
            {filteredMyths.map((item) => {
              const isExpanded = Boolean(expandedListItems[item.id]);

              return (
                <motion.article
                  key={item.id}
                  className={`edu-list-item${isExpanded ? " expanded" : ""}`}
                  variants={staggerItem}
                >
                  <button
                    type="button"
                    className="edu-list-header"
                    onClick={() => toggleListExpand(item.id)}
                    aria-expanded={isExpanded}
                  >
                    <span className="edu-list-icon" aria-hidden="true">❌</span>
                    <span className="edu-list-title">{item.myth}</span>
                    <span className={`edu-list-chevron${isExpanded ? " open" : ""}`} aria-hidden="true">▾</span>
                  </button>

                  {isExpanded && (
                    <div className="edu-list-body">
                      <div className="edu-list-fact">
                        <span className="edu-card-badge fact" aria-hidden="true">✅ Fact</span>
                        <p>{item.fact}</p>
                      </div>
                      <p className="edu-card-source">{formatSourceLabel(item.source)}</p>
                      <span className="edu-list-category">{item.category}</span>
                    </div>
                  )}
                </motion.article>
              );
            })}
          </motion.div>
        )}

        {/* ─── QUIZ MODE ─── */}
        {mode === VIEW_MODES.QUIZ && !isLoading && !errorMessage && (
          <motion.article className="edu-quiz-card" variants={staggerItem}>
            <p className="edu-quiz-score">
              Score: {quizScore.correct}/{quizScore.total}
            </p>

            {!quizQuestion && <p className="edu-status">No quiz items available for this category.</p>}

            {quizQuestion && (
              <>
                <p className="edu-quiz-prompt">Is this Myth or Fact?</p>
                <p className="edu-quiz-statement">{quizQuestion.statement}</p>

                <div className="edu-quiz-actions">
                  <button
                    type="button"
                    className={`edu-quiz-answer-btn myth${selectedAnswer === "Myth" ? " selected" : ""}`}
                    onClick={() => submitQuizAnswer("Myth")}
                    disabled={quizAnswered}
                  >
                    ❌ Myth
                  </button>
                  <button
                    type="button"
                    className={`edu-quiz-answer-btn fact${selectedAnswer === "Fact" ? " selected" : ""}`}
                    onClick={() => submitQuizAnswer("Fact")}
                    disabled={quizAnswered}
                  >
                    ✅ Fact
                  </button>
                </div>

                {quizAnswered && (
                  <div
                    className={`edu-quiz-result ${
                      selectedAnswer === quizQuestion.correctAnswer ? "correct" : "incorrect"
                    }`}
                  >
                    <p className="edu-quiz-result-label">
                      {selectedAnswer === quizQuestion.correctAnswer ? "🎉 Correct!" : "💡 Not quite."}
                    </p>
                    <p className="edu-quiz-correct-answer">Correct answer: {quizQuestion.correctAnswer}</p>
                    <p className="edu-quiz-explanation">{quizQuestion.explanation}</p>
                    <p className="edu-quiz-source">{quizQuestion.source}</p>
                    <button type="button" className="edu-quiz-next-btn" onClick={goToNextQuizQuestion}>
                      Next Question →
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
