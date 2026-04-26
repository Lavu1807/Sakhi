import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../../shared/components/PageFrame";
import { staggerItem, staggerParent } from "../../shared/utils/motionPresets";
import { sendChatMessage } from "../../shared/utils/api";
import { getAuthToken } from "../../shared/utils/auth";
import { getSymptomChatContext } from "../symptoms/symptomContext";
import { getMoodChatContext } from "../mood/moodContext";

const QUICK_SUGGESTIONS = ["I have cramps", "I feel sad", "What should I eat?"];
const BOT_ERROR_MESSAGE = "I am having trouble responding right now. Please try again in a moment.";

function createMessage(sender, text) {
  return {
    id: `${sender}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sender,
    text,
  };
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Chatbot() {
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    createMessage("bot", "Hi, I am Sakhi support bot. You can share how you feel, and I will try to help."),
  ]);
  const sessionIdRef = useRef(createSessionId());
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    const chatContainer = chatHistoryRef.current;
    if (!chatContainer) {
      return;
    }

    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  async function submitMessage(rawMessage) {
    const trimmedMessage = String(rawMessage || "").trim();
    if (!trimmedMessage || isLoading) {
      return;
    }

    setMessages((previousMessages) => [...previousMessages, createMessage("user", trimmedMessage)]);
    setInputMessage("");
    setIsLoading(true);
    const symptomChatContext = getSymptomChatContext();
    const moodChatContext = getMoodChatContext();
    const userContext = {
      ...(symptomChatContext || {}),
      ...(moodChatContext || {}),
    };

    try {
      const response = await sendChatMessage(
        {
          message: trimmedMessage,
          sessionId: sessionIdRef.current,
          userContext: Object.keys(userContext).length > 0 ? userContext : undefined,
        },
        getAuthToken() || undefined,
      );

      const botReply =
        typeof response?.reply === "string" && response.reply.trim().length > 0
          ? response.reply.trim()
          : BOT_ERROR_MESSAGE;

      setMessages((previousMessages) => [...previousMessages, createMessage("bot", botReply)]);
    } catch {
      setMessages((previousMessages) => [...previousMessages, createMessage("bot", BOT_ERROR_MESSAGE)]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    await submitMessage(inputMessage);
  }

  async function handleSuggestionClick(suggestion) {
    await submitMessage(suggestion);
  }

  return (
    <PageFrame>
      <motion.section className="page-card chatbot-card chatbot-shell" variants={staggerParent} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={staggerItem}>
          Always Here To Listen
        </motion.p>

        <motion.h2 className="heading-with-icon" variants={staggerItem}>
          <span className="heading-icon" aria-hidden="true">
            💬
          </span>
          Sakhi Chatbot
        </motion.h2>

        <motion.p className="chatbot-note" variants={staggerItem}>
          Share how you are feeling today. I will respond with gentle, supportive guidance.
        </motion.p>

        <motion.div className="chatbot-interaction" variants={staggerItem}>
          <div className="chat-suggestions" role="group" aria-label="Quick suggestions">
            {QUICK_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="chat-suggestion-btn"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {isLoading ? <p className="chat-loading-state">Generating response...</p> : null}

          <div ref={chatHistoryRef} className="chat-history" aria-live="polite" aria-busy={isLoading}>
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  layout
                  key={message.id}
                  className={`chat-message ${message.sender}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="chat-bubble">{message.text}</div>
                </motion.div>
              ))}

              {isLoading ? (
                <motion.div
                  layout
                  key="typing-indicator"
                  className="chat-message bot"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="chat-bubble chat-typing-bubble" role="status" aria-live="polite">
                    <span className="typing-indicator" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="chat-typing-text">Sakhi is typing...</span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSend} className="chat-form chat-composer">
            <input
              type="text"
              className="chat-input"
              placeholder={isLoading ? "Please wait for Sakhi response" : "Type your message"}
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="btn-primary chat-send-btn"
              disabled={isLoading || inputMessage.trim().length === 0}
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </form>
        </motion.div>

        <motion.p className="link-row" variants={staggerItem}>
          <Link to="/dashboard">Back to Dashboard</Link>
        </motion.p>
      </motion.section>
    </PageFrame>
  );
}


