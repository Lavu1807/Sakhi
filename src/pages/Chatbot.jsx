import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageFrame from "../components/PageFrame";
import { staggerItem, staggerParent } from "../components/motionPresets";

function getBotReply(message) {
  const text = message.toLowerCase();

  if (text.includes("pain")) {
    return "I am sorry you are in pain. Please rest, stay hydrated, and use a warm compress. If pain is severe, consider talking to a doctor.";
  }

  if (text.includes("sad")) {
    return "It is okay to feel this way. You are not alone. Try slow breathing, light movement, and speaking to someone you trust.";
  }

  if (text.includes("period")) {
    return "Periods are a normal part of the menstrual cycle. Tracking your dates can help you understand patterns and feel more prepared.";
  }

  return "I am here to support you. Tell me more about how you are feeling, and we can take one small step at a time.";
}

export default function Chatbot() {
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hi, I am Sakhi support bot. You can share how you feel, and I will try to help.",
    },
  ]);

  function handleSend(event) {
    event.preventDefault();

    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    const botReply = getBotReply(trimmedMessage);

    setMessages((previousMessages) => [
      ...previousMessages,
      { sender: "user", text: trimmedMessage },
      { sender: "bot", text: botReply },
    ]);

    setInputMessage("");
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
          <div className="chat-history" aria-live="polite">
            <AnimatePresence initial={false}>
              {messages.map((message, index) => (
                <motion.div
                  layout
                  key={`${message.sender}-${index}`}
                  className={`chat-message ${message.sender}`}
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="chat-bubble">{message.text}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <form onSubmit={handleSend} className="chat-form chat-composer">
            <input
              type="text"
              className="chat-input"
              placeholder="Type your message"
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
            />
            <button type="submit" className="btn-primary chat-send-btn">
              Send
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


